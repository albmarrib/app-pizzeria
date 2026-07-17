import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  // En producción, esto debe estar en Vercel Env Variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER_MOCK';
  const stripe = new Stripe(stripeSecretKey);

  try {
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const connectedAccountId = response.stripe_user_id;
    return res.status(200).json({ connectedAccountId });
  } catch (error) {
    console.error('Stripe Connect Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
