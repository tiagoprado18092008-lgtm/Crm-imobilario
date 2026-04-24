import twilio from 'twilio'
import AccessToken = require('twilio/lib/jwt/AccessToken')
import VoiceGrant = AccessToken.VoiceGrant

export function isTwilioConfigured(): boolean {
  // Phone number is optional — we can look one up from the DB when needed
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  )
}

export function generateTwilioToken(identity: string): string {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio not configured')
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const apiKey = process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID!
  const apiSecret = process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN!
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID || ''

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 3600,
  })

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid || undefined,
    incomingAllow: true,
  })

  token.addGrant(voiceGrant)
  return token.toJwt()
}

export async function sendSMS(to: string, body: string): Promise<{ sid: string; status: string }> {
  if (!isTwilioConfigured()) {
    console.log(`[Twilio SIM] SMS to ${to}: ${body}`)
    return { sid: `sim_sms_${Date.now()}`, status: 'queued' }
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const msg = await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER!,
    body,
  })
  return { sid: msg.sid, status: msg.status }
}

export async function makeOutboundCall(
  to: string,
  from?: string
): Promise<{ sid: string; status: string }> {
  if (!isTwilioConfigured()) {
    console.log(`[Twilio SIM] Calling ${to} from ${from || process.env.TWILIO_PHONE_NUMBER}`)
    return { sid: `sim_call_${Date.now()}`, status: 'queued' }
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const call = await client.calls.create({
    to,
    from: from || process.env.TWILIO_PHONE_NUMBER!,
    url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/webhook/twilio/voice`,
    statusCallback: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/webhook/twilio/status`,
    statusCallbackMethod: 'POST',
  })

  return { sid: call.sid, status: call.status }
}
