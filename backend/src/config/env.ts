import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key_crypto_wallet',
  webhookSecret: process.env.WEBHOOK_SECRET_KEY || 'whsec_prod_super_secret_signing_key_2026',
  defaultSpreadPercentage: parseFloat(process.env.DEFAULT_SPREAD_PERCENTAGE || '1.0'),
  quoteTtlSeconds: parseInt(process.env.QUOTE_TTL_SECONDS || '30', 10),
};
