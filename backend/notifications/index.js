import { sendEmailNotification } from "./email.js";
import { sendPushNotification } from "./push.js";

export async function sendNotification(updates) {
  await Promise.allSettled([
    sendPushNotification(updates),
    sendEmailNotification(updates),
  ]);
}
