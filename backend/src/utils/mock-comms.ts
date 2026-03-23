export const sendMockEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; simulatedAt: Date }> => {
  const simulatedAt = new Date();
  console.log(`📧 [MOCK EMAIL]`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${body}`);
  console.log(`   Simulated at: ${simulatedAt.toISOString()}`);
  return { success: true, simulatedAt };
};

export const sendMockWhatsApp = async (
  to: string,
  message: string
): Promise<{ success: boolean; simulatedAt: Date }> => {
  const simulatedAt = new Date();
  console.log(`💬 [MOCK WHATSAPP]`);
  console.log(`   To: ${to}`);
  console.log(`   Message: ${message}`);
  console.log(`   Simulated at: ${simulatedAt.toISOString()}`);
  return { success: true, simulatedAt };
};
