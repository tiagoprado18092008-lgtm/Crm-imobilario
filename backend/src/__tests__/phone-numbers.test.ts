import * as service from '../modules/phone-numbers/phone-numbers.service';

jest.mock('twilio', () => {
  const mApps = { list: jest.fn(), create: jest.fn() };
  const mKeys = { list: jest.fn(), create: jest.fn() };
  const mValidation = { create: jest.fn() };
  const mOutgoing = { list: jest.fn() };
  const mClient: any = {
    applications: mApps,
    newKeys: mKeys,
    validationRequests: mValidation,
    outgoingCallerIds: mOutgoing,
    api: { accounts: () => ({ fetch: jest.fn().mockResolvedValue({ sid: 'AC123' }) }) },
  };
  const fn: any = jest.fn(() => mClient);
  fn.__mock = { mApps, mKeys, mValidation, mOutgoing, mClient };
  return fn;
});

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    systemSettings: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    phoneNumber: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'pn1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'pn1', ...data })),
    },
  },
}));

const twilio = require('twilio');

describe('autoProvisionTwilio', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.PUBLIC_URL = 'https://crm.example.com';
    twilio.__mock.mApps.list.mockReset();
    twilio.__mock.mApps.create.mockReset();
    twilio.__mock.mKeys.list.mockReset();
    twilio.__mock.mKeys.create.mockReset();
  });

  it('creates new TwiML App and API Key when none exist', async () => {
    twilio.__mock.mApps.list.mockResolvedValue([]);
    twilio.__mock.mApps.create.mockResolvedValue({ sid: 'APxxx' });
    twilio.__mock.mKeys.list.mockResolvedValue([]);
    twilio.__mock.mKeys.create.mockResolvedValue({ sid: 'SKxxx', secret: 'secret' });

    const result = await service.autoProvisionTwilio();

    expect(twilio.__mock.mApps.create).toHaveBeenCalledWith(expect.objectContaining({
      friendlyName: 'CRM Voice',
      voiceUrl: 'https://crm.example.com/webhook/twilio/client',
      voiceMethod: 'POST',
    }));
    expect(result.twimlAppSid).toBe('APxxx');
    expect(result.apiKey).toBe('SKxxx');
  });

  it('reuses existing TwiML App with friendlyName CRM Voice', async () => {
    twilio.__mock.mApps.list.mockResolvedValue([{ sid: 'APexist', friendlyName: 'CRM Voice' }]);
    twilio.__mock.mKeys.list.mockResolvedValue([]);
    twilio.__mock.mKeys.create.mockResolvedValue({ sid: 'SKxxx', secret: 'secret' });

    const result = await service.autoProvisionTwilio();

    expect(twilio.__mock.mApps.create).not.toHaveBeenCalled();
    expect(result.twimlAppSid).toBe('APexist');
  });

  it('throws if PUBLIC_URL missing', async () => {
    delete process.env.PUBLIC_URL;
    await expect(service.autoProvisionTwilio()).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('PUBLIC_URL'),
    });
  });
});

describe('verifyPersonalNumber', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    twilio.__mock.mValidation.create.mockReset();
  });

  it('rejects invalid E.164 number', async () => {
    await expect(service.verifyPersonalNumber('user1', '12345', 'sms')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('calls Twilio validationRequests.create with a valid number', async () => {
    twilio.__mock.mValidation.create.mockResolvedValue({
      validationCode: '123456',
      friendlyName: '+351912345678',
      phoneNumber: '+351912345678',
    });
    const result = await service.verifyPersonalNumber('user1', '+351912345678', 'sms');
    expect(result.validationCode).toBe('123456');
  });
});

describe('confirmPersonalNumber', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    twilio.__mock.mOutgoing.list.mockReset();
  });

  it('rejects when Twilio has no verified caller ID for this number yet', async () => {
    twilio.__mock.mOutgoing.list.mockResolvedValue([]);
    await expect(service.confirmPersonalNumber('user1', '+351912345678')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('creates PhoneNumber when Twilio confirms verification', async () => {
    twilio.__mock.mOutgoing.list.mockResolvedValue([{ phoneNumber: '+351912345678' }]);
    const pn = require('../config/database').default.phoneNumber;
    pn.findUnique.mockResolvedValueOnce(null);
    const result: any = await service.confirmPersonalNumber('user1', '+351912345678', 'Meu');
    expect(pn.create).toHaveBeenCalled();
    expect(result.source).toBe('EXTERNAL_VERIFIED');
  });
});

describe('updateRoutingSettings', () => {
  it('updates ringAll and voicemailEnabled for a user-owned number', async () => {
    const pn = require('../config/database').default.phoneNumber;
    pn.findFirst.mockResolvedValueOnce({ id: 'pn1', userId: 'user1' });
    pn.update.mockResolvedValueOnce({ id: 'pn1', ringAll: true, voicemailEnabled: false });

    const result: any = await service.updateRoutingSettings('pn1', 'user1', { ringAll: true, voicemailEnabled: false });
    expect(result.ringAll).toBe(true);
    expect(pn.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pn1' },
      data: { ringAll: true, voicemailEnabled: false },
    }));
  });
});
