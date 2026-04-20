import * as callsService from '../modules/calls/calls.service';

jest.mock('../utils/twilio.service', () => ({
  generateTwilioToken: jest.fn().mockReturnValue('tok'),
  isTwilioConfigured: jest.fn().mockReturnValue(true),
  makeOutboundCall: jest.fn().mockResolvedValue({ sid: 'CA1', status: 'queued' }),
  sendSMS: jest.fn().mockResolvedValue({ sid: 'SMS1', status: 'queued' }),
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }) },
    phoneNumber: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    interaction: {
      create: jest.fn().mockResolvedValue({ id: 'i1' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

const twilio = require('../utils/twilio.service');
const db = require('../config/database').default;

describe('initiateCall with fromNumberId', () => {
  beforeEach(() => {
    twilio.makeOutboundCall.mockClear();
    db.phoneNumber.findFirst.mockReset();
  });

  it('uses PhoneNumber.number as callerId when fromNumberId provided', async () => {
    db.phoneNumber.findFirst.mockResolvedValue({
      id: 'pn1', number: '+351910000000', userId: 'u1', status: 'ACTIVE',
    });
    await callsService.initiateCall({ to: '+351911111111', userId: 'u1', fromNumberId: 'pn1' });
    expect(twilio.makeOutboundCall).toHaveBeenCalledWith('+351911111111', '+351910000000');
  });

  it('falls back to env TWILIO_PHONE_NUMBER when fromNumberId not provided', async () => {
    await callsService.initiateCall({ to: '+351911111111', userId: 'u1' });
    expect(twilio.makeOutboundCall).toHaveBeenCalledWith('+351911111111', undefined);
  });

  it('rejects when fromNumberId does not belong to user', async () => {
    db.phoneNumber.findFirst.mockResolvedValue(null);
    await expect(
      callsService.initiateCall({ to: '+351911111111', userId: 'u1', fromNumberId: 'other' })
    ).rejects.toMatchObject({ status: 403 });
  });
});
