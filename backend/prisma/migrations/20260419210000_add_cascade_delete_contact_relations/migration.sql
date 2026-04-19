-- AlterTable: Add CASCADE delete for Contact relations so deleting a Contact also deletes related records

-- Opportunity
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_contactId_fkey";
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Interaction
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_contactId_fkey";
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EmailCampaignRecipient
ALTER TABLE "EmailCampaignRecipient" DROP CONSTRAINT "EmailCampaignRecipient_contactId_fkey";
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AutomationEnrollment
ALTER TABLE "AutomationEnrollment" DROP CONSTRAINT "AutomationEnrollment_contactId_fkey";
ALTER TABLE "AutomationEnrollment" ADD CONSTRAINT "AutomationEnrollment_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
