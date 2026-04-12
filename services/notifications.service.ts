import { Resend } from 'resend'
import type { Booking, SwitchRequest, Profile } from '@/types/domain'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }
const FROM = 'school-rooms@yourdomain.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function bookingDetails(booking: Booking): string {
  const room = booking.room
  const roomLabel = room ? `קומה ${room.floor}, חדר ${room.room_number}` : 'חדר לא ידוע'
  const start = new Date(booking.start_time).toLocaleString('he-IL')
  const end = new Date(booking.end_time).toLocaleString('he-IL')
  return `${roomLabel} | ${start} – ${end}`
}

export async function sendBookingConfirmed(booking: Booking): Promise<void> {
  const email = booking.profile?.email
  if (!email) return

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'ההזמנה שלך אושרה',
    html: `
      <p>שלום ${booking.profile?.full_name},</p>
      <p>ההזמנה שלך אושרה בהצלחה:</p>
      <p><strong>${bookingDetails(booking)}</strong></p>
      <p><a href="${APP_URL}/bookings">לניהול ההזמנות שלך</a></p>
    `,
  })
}

export async function sendAdminCanceled(booking: Booking): Promise<void> {
  const email = booking.profile?.email
  if (!email) return

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'ההזמנה שלך בוטלה',
    html: `
      <p>שלום ${booking.profile?.full_name},</p>
      <p>ההזמנה הבאה בוטלה על ידי מנהל:</p>
      <p><strong>${bookingDetails(booking)}</strong></p>
      <p><a href="${APP_URL}/rooms">לחפש חדר אחר</a></p>
    `,
  })
}

export async function sendSwitchRequest(
  switchRequest: SwitchRequest,
  targetBooking: Booking
): Promise<void> {
  const email = targetBooking.profile?.email
  if (!email) return

  const requesterName = switchRequest.requester_booking?.profile?.full_name ?? 'משתמש'

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'בקשת החלפת חדר',
    html: `
      <p>שלום ${targetBooking.profile?.full_name},</p>
      <p><strong>${requesterName}</strong> מבקש/ת להחליף חדר איתך:</p>
      <p>החדר שלך: <strong>${bookingDetails(targetBooking)}</strong></p>
      <p>החדר שלהם: <strong>${bookingDetails(switchRequest.requester_booking!)}</strong></p>
      <p><a href="${APP_URL}/bookings">לאישור או דחיית הבקשה</a></p>
    `,
  })
}

export async function sendSwitchApproved(
  requesterBooking: Booking,
  targetBooking: Booking
): Promise<void> {
  const emails = [
    { booking: requesterBooking, newRoom: targetBooking },
    { booking: targetBooking, newRoom: requesterBooking },
  ]

  await Promise.all(
    emails.map(({ booking, newRoom }) => {
      const email = booking.profile?.email
      if (!email) return Promise.resolve()
      return getResend().emails.send({
        from: FROM,
        to: email,
        subject: 'החלפת חדר אושרה',
        html: `
          <p>שלום ${booking.profile?.full_name},</p>
          <p>החלפת החדר אושרה. החדר החדש שלך:</p>
          <p><strong>${bookingDetails(newRoom)}</strong></p>
          <p><a href="${APP_URL}/bookings">לניהול ההזמנות שלך</a></p>
        `,
      })
    })
  )
}

export async function sendRoomDeleted(
  userEmail: string,
  userName: string,
  roomLabel: string,
  startTime: string,
  endTime: string
): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: userEmail,
    subject: 'הזמנתך בוטלה — החדר הוסר מהמערכת',
    html: `
      <p>שלום ${userName},</p>
      <p>ההזמנה שלך לחדר <strong>${roomLabel}</strong> בוטלה מאחר שהחדר הוסר מהמערכת.</p>
      <p>מועד ההזמנה: ${new Date(startTime).toLocaleString('he-IL')} – ${new Date(endTime).toLocaleTimeString('he-IL')}</p>
      <p><a href="${APP_URL}/rooms">לחפש חדר חלופי</a></p>
    `,
  })
}

export async function sendScheduleConflict(booking: Booking, templateName: string): Promise<void> {
  const email = booking.profile?.email
  if (!email) return

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'הזמנתך בוטלה — שינוי במערכת שעות',
    html: `
      <p>שלום ${booking.profile?.full_name},</p>
      <p>ההזמנה שלך בוטלה כיוון שמערכת השעות של החדר עודכנה (${templateName})
      והחדר מסומן כתפוס בשעה זו.</p>
      <p><strong>${bookingDetails(booking)}</strong></p>
      <p><a href="${APP_URL}/rooms">לחפש חדר אחר</a></p>
    `,
  })
}

export async function sendSwitchAutoCanceled(
  switchRequest: SwitchRequest,
  targetBooking: Booking
): Promise<void> {
  const email = targetBooking.profile?.email
  if (!email) return

  const requesterName = switchRequest.requester_booking?.profile?.full_name ?? 'המשתמש'

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'בקשת החלפת חדר בוטלה',
    html: `
      <p>שלום ${targetBooking.profile?.full_name},</p>
      <p>בקשת החלפת החדר מאת <strong>${requesterName}</strong> בוטלה אוטומטית,</p>
      <p>כיוון ש-${requesterName} הזמין/ה חדר אחר.</p>
      <p><a href="${APP_URL}/bookings">לניהול ההזמנות שלך</a></p>
    `,
  })
}

export async function sendEventReminder(
  event: { title: string; event_date: string | null; responsible_user?: { full_name: string; email: string } | null },
  admins: Pick<Profile, 'full_name' | 'email'>[]
): Promise<void> {
  const recipients = [
    ...(event.responsible_user ? [event.responsible_user.email] : []),
    ...admins.map(a => a.email),
  ].filter(Boolean)

  if (recipients.length === 0) return

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('he-IL')
    : 'תאריך לא נקבע'

  await getResend().emails.send({
    from: FROM,
    to: [...new Set(recipients)] as string[],
    subject: `תזכורת: ארוע "${event.title}" ללא חדר מוזמן`,
    html: `
      <p>הארוע <strong>${event.title}</strong> מתוכנן ל-${dateStr} ועדיין אין חדר מוזמן עבורו.</p>
      <p><a href="${APP_URL}/admin/events">לניהול ארועים</a></p>
    `,
  })
}

export async function sendRecurringApproved(
  userEmail: string,
  userName: string,
  roomNumber: string,
  dayName: string,
  count: number
): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: userEmail,
    subject: 'בקשת הזמנה חוזרת אושרה',
    html: `
      <p>שלום ${userName},</p>
      <p>בקשת ההזמנה החוזרת שלך אושרה:</p>
      <p>חדר <strong>${roomNumber}</strong> — כל יום <strong>${dayName}</strong></p>
      <p>נוצרו <strong>${count}</strong> הזמנות.</p>
      <p><a href="${APP_URL}/bookings">לצפייה בהזמנות שלך</a></p>
    `,
  })
}

export async function sendRecurringRejected(
  userEmail: string,
  userName: string,
  roomNumber: string,
  adminNote: string
): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: userEmail,
    subject: 'בקשת הזמנה חוזרת נדחתה',
    html: `
      <p>שלום ${userName},</p>
      <p>בקשת ההזמנה החוזרת שלך לחדר <strong>${roomNumber}</strong> נדחתה.</p>
      ${adminNote ? `<p>הערת מנהל: ${adminNote}</p>` : ''}
      <p><a href="${APP_URL}/rooms">לחיפוש חדר</a></p>
    `,
  })
}
