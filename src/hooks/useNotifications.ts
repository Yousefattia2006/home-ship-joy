import { supabase } from '@/integrations/supabase/client';

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'info',
  deliveryId?: string
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    delivery_id: deliveryId || null,
  });
}

export async function sendOrderStatusNotification(
  delivery: any,
  newStatus: string,
  translations: any
) {
  const statusMessages: Record<string, { storeTitle: string; storeBody: string; driverTitle?: string; driverBody?: string }> = {
    driver_accepted: {
      storeTitle: translations?.driverAccepted || 'Driver Accepted',
      storeBody: translations?.driverAcceptedBody || 'A driver has accepted your delivery.',
    },
    arriving_pickup: {
      storeTitle: translations?.driverNearStore || 'Driver Near Store',
      storeBody: translations?.driverNearStoreBody || 'The driver is arriving at your store.',
    },
    picked_up: {
      storeTitle: translations?.orderPickedUp || 'Order Picked Up',
      storeBody: translations?.orderPickedUpBody || 'The driver has picked up the order.',
    },
    en_route: {
      storeTitle: translations?.driverEnRoute || 'Driver En Route',
      storeBody: translations?.driverEnRouteBody || 'The driver is on the way to the customer.',
    },
    delivered: {
      storeTitle: translations?.orderDelivered || 'Order Delivered',
      storeBody: translations?.orderDeliveredBody || 'The order has been delivered successfully.',
      driverTitle: translations?.earningsUpdated || 'Earnings Updated',
      driverBody: translations?.earningsUpdatedBody || 'Your earnings have been updated.',
    },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  // Notify store
  if (delivery.store_user_id) {
    await sendNotification(delivery.store_user_id, msg.storeTitle, msg.storeBody, 'order_update', delivery.id);
  }

  // Notify driver
  if (msg.driverTitle && delivery.driver_user_id) {
    await sendNotification(delivery.driver_user_id, msg.driverTitle, msg.driverBody!, 'order_update', delivery.id);
  }
}
