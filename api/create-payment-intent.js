import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, connectedAccountId } = req.body;
  
  if (!amount || !connectedAccountId) {
    return res.status(400).json({ error: 'Missing amount or connectedAccountId' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER_MOCK';
  const stripe = new Stripe(stripeSecretKey);

  try {
    const intentParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      payment_method_types: ['card'],
    };

    const requestOptions = {};
    if (connectedAccountId) {
      requestOptions.stripeAccount = connectedAccountId;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams, requestOptions);

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe PaymentIntent Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
