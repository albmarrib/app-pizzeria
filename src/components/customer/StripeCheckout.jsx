import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Esto usa el Publishable Key de la plataforma
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER_MOCK');

const CheckoutForm = ({ amount, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required'
    });

    if (confirmError) {
      setError(confirmError.message);
      onPaymentError(confirmError);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaymentSuccess(paymentIntent);
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ 
        layout: 'tabs',
        wallets: { applePay: 'auto', googlePay: 'auto' }
      }} />
      {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">{error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || processing} 
        className="w-full bg-[#635BFF] hover:bg-[#4B45D6] text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-colors shadow-lg disabled:opacity-70 mt-4"
      >
        {processing ? 'Procesando Pago...' : `Pagar ${amount.toFixed(2)}€`}
      </button>
    </form>
  );
};

const StripeCheckout = ({ amount, connectedAccountId, onPaymentSuccess, onPaymentError }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pedir al backend que cree el PaymentIntent en la cuenta conectada
    const createIntent = async () => {
      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, connectedAccountId })
        });
        const data = await res.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.error || 'Error al conectar con el servidor de pagos');
        }
      } catch (err) {
        onPaymentError(err);
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [amount, connectedAccountId, onPaymentError]);

  if (loading) return <div className="p-4 text-center text-sm text-gray-500 font-bold animate-pulse">Conectando pasarela segura...</div>;
  if (!clientSecret) return <div className="p-4 text-center text-red-500 text-sm">Error cargando Stripe</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <CheckoutForm amount={amount} onPaymentSuccess={onPaymentSuccess} onPaymentError={onPaymentError} />
      </Elements>
    </div>
  );
};

export default StripeCheckout;
