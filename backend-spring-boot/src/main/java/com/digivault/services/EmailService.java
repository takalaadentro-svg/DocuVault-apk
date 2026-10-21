package com.digivault.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.internet.MimeMessage;
import java.security.SecureRandom;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    private final SecureRandom random = new SecureRandom();

    public String generate6DigitOtp() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    public boolean sendOtpEmail(String toEmail, String otp, String purpose) {
        logger.info("==================================================");
        logger.info("DocuVault Security OTP Generated: [{}] for [{}] ({})", otp, toEmail, purpose);
        logger.info("==================================================");

        if (mailSender == null || mailFrom == null || mailFrom.trim().isEmpty()) {
            logger.warn("SMTP MailSender is not configured (spring.mail.username is empty). OTP logged to server output: {}", otp);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "DocuVault Security");
            helper.setTo(toEmail);
            helper.setSubject("DocuVault Verification Code: " + otp);

            String html = "<div style='font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #1E293B;'>"
                    + "<div style='text-align: center; margin-bottom: 28px;'>"
                    + "<div style='display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0D9488, #1E3A8A); line-height: 48px; font-size: 24px; margin-bottom: 12px;'>&#128737;</div>"
                    + "<h1 style='color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;'>Docu<span style='color: #14B8A6;'>Vault</span></h1>"
                    + "<p style='color: #94A3B8; font-size: 13px; margin: 6px 0 0 0;'>Smart Digital Document Locker & Family Emergency Vault</p>"
                    + "</div>"
                    + "<div style='background-color: #1E293B; padding: 28px 20px; border-radius: 14px; border: 1px solid #334155; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);'>"
                    + "<p style='font-size: 14px; color: #CBD5E1; margin: 0 0 16px 0;'>Use the following 6-digit one-time code to verify your email address:</p>"
                    + "<div style='display: inline-block; padding: 14px 28px; background-color: #0F172A; border: 1px solid #0D9488; border-radius: 12px; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #2DD4BF; font-family: monospace;'>"
                    + otp
                    + "</div>"
                    + "<p style='font-size: 12px; color: #94A3B8; margin: 20px 0 0 0;'>&#9203; Valid for <b>10 minutes</b>. For your security, never share this code.</p>"
                    + "</div>"
                    + "<p style='font-size: 11px; color: #64748B; text-align: center; margin: 28px 0 0 0;'>If you did not request this verification code, please ignore this email or contact support.</p>"
                    + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
            logger.info("Successfully delivered verification email to {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to deliver verification email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    public boolean sendFamilyInvitationEmail(String toEmail, String inviterName, String vaultName, String token, java.util.Date expiresAt) {
        logger.info("Sending Family Vault Invitation to [{}] from [{}] for vault [{}]", toEmail, inviterName, vaultName);

        if (mailSender == null || mailFrom == null || mailFrom.trim().isEmpty()) {
            logger.warn("SMTP MailSender not configured. Skipping family invite email dispatch.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "DocuVault Family Locker");
            helper.setTo(toEmail);
            helper.setSubject("DocuVault - You've been invited to join the '" + vaultName + "' Family Vault");

            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEEE, MMMM d, yyyy");
            String expiryStr = (expiresAt != null) ? sdf.format(expiresAt) : "in 7 days";

            String html = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #1E293B;\">"
                    + "<div style=\"text-align: center; margin-bottom: 24px;\">"
                    + "<div style=\"display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0D9488, #1E3A8A); line-height: 48px; font-size: 24px; margin-bottom: 12px;\">&#128737;</div>"
                    + "<h1 style=\"color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;\">Docu<span style=\"color: #14B8A6;\">Vault</span></h1>"
                    + "<p style=\"color: #94A3B8; font-size: 13px; margin: 6px 0 0 0;\">Smart Digital Document Locker &amp; Family Vault</p>"
                    + "</div>"
                    + "<div style=\"background-color: #1E293B; padding: 24px 20px; border-radius: 14px; border: 1px solid #334155; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.3);\">"
                    + "<p style=\"font-size: 15px; color: #E2E8F0; margin: 0 0 12px 0;\">Hello,</p>"
                    + "<p style=\"font-size: 14px; color: #CBD5E1; line-height: 1.5; margin: 0 0 20px 0;\">"
                    + "<strong style=\"color: #FFFFFF;\">" + inviterName + "</strong> has invited you to join their Family Vault: <strong style=\"color: #2DD4BF;\">\"" + vaultName + "\"</strong>."
                    + "</p>"
                    + "<div style=\"text-align: center; margin: 24px 0;\">"
                    + "<a href=\"https://docuvault-frontend.onrender.com/#/family?token=" + token + "\" style=\"display: inline-block; padding: 13px 28px; background: linear-gradient(135deg, #0D9488, #2563EB); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);\">"
                    + "Open Invitation in DocuVault"
                    + "</a>"
                    + "</div>"
                    + "<div style=\"background-color: #0F172A; border: 1px dashed #475569; border-radius: 10px; padding: 14px; margin: 20px 0; text-align: center;\">"
                    + "<p style=\"font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; margin: 0 0 6px 0;\">Your Invitation Token</p>"
                    + "<code style=\"font-family: monospace; font-size: 13px; color: #2DD4BF; word-break: break-all; font-weight: bold;\">" + token + "</code>"
                    + "</div>"
                    + "<p style=\"font-size: 12px; color: #94A3B8; line-height: 1.5; margin: 16px 0 0 0;\">"
                    + "<b>How to accept:</b><br/>"
                    + "1. Sign in to DocuVault with <b>" + toEmail + "</b>.<br/>"
                    + "2. Go to <b>Family Vault</b> &rarr; tap <b>Enter Invitation Token</b>.<br/>"
                    + "3. Paste the token above to instantly access shared family documents and emergency records."
                    + "</p>"
                    + "<p style=\"font-size: 12px; color: #E2E8F0; margin: 20px 0 0 0; padding-top: 14px; border-top: 1px solid #334155;\">"
                    + "&#9203; This invitation is valid until <b>" + expiryStr + "</b>."
                    + "</p>"
                    + "</div>"
                    + "<p style=\"font-size: 11px; color: #64748B; text-align: center; margin: 24px 0 0 0;\">"
                    + "If you did not expect this invitation, you can safely ignore this email."
                    + "</p>"
                    + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
            logger.info("Successfully delivered family invitation email to {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to deliver family invitation email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }
}
