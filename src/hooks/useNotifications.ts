import { supabase } from '@/integrations/supabase/client';

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'info',
  deliveryId?: string,
  data?: Record<string, unknown>
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    delivery_id: deliveryId || null,
    data: data || null,
  });
}

/** Insert notification for: new_order, driver_accepted, arriving_pickup, near_customer, cancelled, delivered */
export async function sendOrderEventNotification(
  event: 'new_order' | 'driver_accepted' | 'arriving_pickup' | 'near_customer' | 'cancelled' | 'delivered',
  targetUserId: string,
  deliveryId: string,
  translations: any,
  extraData?: Record<string, unknown>
) {
  const map: Record<string, { titleKey: string; bodyKey: string; fallbackTitle: string; fallbackBody: string }> = {
    new_order: {
      titleKey: 'newOrder', bodyKey: 'newOrderBody',
      fallbackTitle: 'New Order', fallbackBody: 'A new delivery order has been created.',
    },
    driver_accepted: {
      titleKey: 'driverAccepted', bodyKey: 'driverAcceptedBody',
      fallbackTitle: 'Driver Accepted', fallbackBody: 'A driver has accepted your delivery.',
    },
    arriving_pickup: {
      titleKey: 'arrivedPickup', bodyKey: 'arrivedPickupBody',
      fallbackTitle: 'Arrived at Pickup', fallbackBody: 'The driver has arrived at the pickup location.',
    },
    near_customer: {
      titleKey: 'nearCustomer', bodyKey: 'nearCustomerBody',
      fallbackTitle: 'Driver Nearby', fallbackBody: 'The driver is near the customer.',
    },
    cancelled: {
      titleKey: 'orderCancelled', bodyKey: 'orderCancelledBody',
      fallbackTitle: 'Order Cancelled', fallbackBody: 'The delivery order has been cancelled.',
    },
    delivered: {
      titleKey: 'orderDelivered', bodyKey: 'orderDeliveredBody',
      fallbackTitle: 'Order Delivered', fallbackBody: 'The order has been delivered successfully.',
    },
  };

  const m = map[event];
  if (!m) return;

  const title = translations?.notifications?.[m.titleKey] || m.fallbackTitle;
  const body = translations?.notifications?.[m.bodyKey] || m.fallbackBody;

  await sendNotification(targetUserId, title, body, event, deliveryId, extraData);
}
