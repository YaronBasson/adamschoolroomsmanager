import { Resend } from 'resend'
import type { Booking, SwitchRequest } from '@/types/domain'

const resend = new Resend(process.env.RESEND_API_KEY)
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

  await resend.emails.send({
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

  await resend.emails.send({
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

  await resend.emails.send({
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
      return resend.emails.send({
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

export async function sendSwitchAutoCanceled(
  switchRequest: SwitchRequest,
  targetBooking: Booking
): Promise<void> {
  const email = targetBooking.profile?.email
  if (!email) return

  const requesterName = switchRequest.requester_booking?.profile?.full_name ?? 'המשתמש'

  await resend.emails.send({
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
