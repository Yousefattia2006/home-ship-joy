import { supabase } from '@/integrations/supabase/client';

async function callSendPush(
  userId: string,
  title: string,
  body: string,
  type: string,
  orderId?: string
) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        user_id: userId,
        title,
        body,
        data: { type, order_id: orderId || null },
      },
    });
  } catch {
    // fail silently if no push token or function unavailable
  }
}

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

  await callSendPush(userId, title, body, type, deliveryId);
}

// ── Store events (sent to store user) ──
const STORE_EVENTS: Record<string, { title: string; body: string }> = {
  driver_found:          { title: 'Driver found',      body: 'A driver accepted your request.' },
  driver_on_the_way:     { title: 'Driver on the way', body: 'Driver is heading to your store.' },
  driver_near_restaurant:{ title: 'Driver nearby',     body: 'Driver is close to your store.' },
  driver_arrived:        { title: 'Driver arrived',    body: 'Driver has arrived at your store.' },
  order_picked_up:       { title: 'Order picked up',   body: 'Order is now on the way to customer.' },
  driver_near_customer:  { title: 'Near customer',     body: 'Driver is close to customer location.' },
  order_delivered:       { title: 'Order delivered',    body: 'The order has been delivered.' },
};

// ── Driver events (sent to driver user) ──
const DRIVER_EVENTS: Record<string, { title: string; body: string }> = {
  new_request:       { title: 'New request',       body: 'You have a new delivery request.' },
  assigned:          { title: 'Request assigned',  body: 'You have been assigned to an order.' },
  near_restaurant:   { title: 'Near pickup',       body: 'You are close to the restaurant.' },
  arrived_pickup:    { title: 'Arrived',           body: 'You have arrived at pickup location.' },
  picked_up:         { title: 'Picked up',         body: 'Order picked up successfully.' },
  near_customer:     { title: 'Near customer',     body: 'You are close to the customer.' },
  delivered:         { title: 'Delivered',         body: 'Order delivered successfully.' },
};

/** Send a store-side notification + push for a delivery event */
export async function sendStoreEventNotification(
  event: string,
  storeUserId: string,
  orderId: string
) {
  const ev = STORE_EVENTS[event];
  if (!ev) return;
  await sendNotification(storeUserId, ev.title, ev.body, event, orderId);
}

/** Send a driver-side notification + push for a delivery event */
export async function sendDriverEventNotification(
  event: string,
  driverUserId: string,
  orderId: string
) {
  const ev = DRIVER_EVENTS[event];
  if (!ev) return;
  await sendNotification(driverUserId, ev.title, ev.body, event, orderId);
}

/** Insert notification for legacy event keys (kept for backward compat) */
export async function sendOrderEventNotification(
  event: 'new_order' | 'driver_accepted' | 'arriving_pickup' | 'near_customer' | 'cancelled' | 'delivered',
  targetUserId: string,
  deliveryId: string,
  translations: any,
  extraData?: Record<string, unknown>
) {
  const map: Record<string, { titleKey: string; bodyKey: string; fallbackTitle: string; fallbackBody: string }> = {
    new_order:        { titleKey: 'newOrder',        bodyKey: 'newOrderBody',        fallbackTitle: 'New Order',          fallbackBody: 'A new delivery order has been created.' },
    driver_accepted:  { titleKey: 'driverAccepted',  bodyKey: 'driverAcceptedBody',  fallbackTitle: 'Driver Accepted',    fallbackBody: 'A driver has accepted your delivery.' },
    arriving_pickup:  { titleKey: 'arrivedPickup',   bodyKey: 'arrivedPickupBody',   fallbackTitle: 'Arrived at Pickup',  fallbackBody: 'The driver has arrived at the pickup location.' },
    near_customer:    { titleKey: 'nearCustomer',    bodyKey: 'nearCustomerBody',    fallbackTitle: 'Driver Nearby',      fallbackBody: 'The driver is near the customer.' },
    cancelled:        { titleKey: 'orderCancelled',  bodyKey: 'orderCancelledBody',  fallbackTitle: 'Order Cancelled',    fallbackBody: 'The delivery order has been cancelled.' },
    delivered:        { titleKey: 'orderDelivered',  bodyKey: 'orderDeliveredBody',  fallbackTitle: 'Order Delivered',    fallbackBody: 'The order has been delivered successfully.' },
  };

  const m = map[event];
  if (!m) return;

  const title = translations?.notifications?.[m.titleKey] || m.fallbackTitle;
  const body = translations?.notifications?.[m.bodyKey] || m.fallbackBody;

  await sendNotification(targetUserId, title, body, event, deliveryId, extraData);
}

/** Legacy wrapper used by DriverDashboard */
export async function sendOrderStatusNotification(
  delivery: any,
  newStatus: string,
  translations: any
) {
  const statusToEvent: Record<string, string> = {
    driver_accepted: 'driver_accepted',
    arriving_pickup: 'arriving_pickup',
    picked_up: 'arriving_pickup',
    en_route: 'near_customer',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  const event = statusToEvent[newStatus];
  if (!event) return;

  if (delivery.store_user_id) {
    await sendOrderEventNotification(event as any, delivery.store_user_id, delivery.id, translations);
  }

  if (newStatus === 'delivered' && delivery.driver_user_id) {
    await sendNotification(
      delivery.driver_user_id,
      translations?.notifications?.orderDelivered || 'Earnings Updated',
      translations?.notifications?.orderDeliveredBody || 'Your earnings have been updated.',
      'delivered',
      delivery.id,
    );
  }
}
