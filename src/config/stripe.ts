import Stripe from "stripe";
import { env } from "./env";

const isDummy =
  !env.stripeSecretKey ||
  env.stripeSecretKey.includes("placeholder") ||
  env.stripeSecretKey === "sk_test_dummy";

export const stripe = isDummy
  ? ({
    paymentIntents: {
      create: async (_params: any) => ({
        id: "pi_mock_" + Math.random().toString(36).substr(2, 9),
        client_secret: "pi_mock_secret_" + Math.random().toString(36).substr(2, 9),
        status: "requires_payment_method",
      }),
    },
    webhooks: {
      constructEvent: (_body: any, _sig: any, _secret: any) => ({
        type: "payment_intent.succeeded",
        data: { object: {} },
      }),
    },
  } as any)
  : new Stripe(env.stripeSecretKey, {
    apiVersion: "2023-10-16",
  } as any);
