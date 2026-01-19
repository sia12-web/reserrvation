import { z } from "zod";

export const reservationRequestSchema = z.object({
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  partySize: z.number().int().min(1).max(50),
  startTime: z.string().datetime(),
  source: z.enum(["KIOSK", "WEB", "PHONE"]).optional(),
  tableIds: z.array(z.string()).optional(),
  customerNotes: z.string().max(500).optional(),
});

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;

export type FieldErrors = Partial<Record<keyof ReservationRequest, string>>;
