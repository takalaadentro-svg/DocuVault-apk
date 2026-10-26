package com.digivault.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.internet.MimeMessage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired(required = false)
    private ObjectMapper objectMapper;

    @Value("${spring.mail.username:${MAIL_USERNAME:takalaadentro@gmail.com}}")
    private String mailFrom;

    @Value("${BREVO_API_KEY:${brevo.api-key:}}")
    private String brevoApiKey;

    @Value("${RESEND_API_KEY:${resend.api-key:}}")
    private String resendApiKey;

    private final SecureRandom random = new SecureRandom();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public String generate6DigitOtp() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    public boolean sendOtpEmail(String toEmail, String otp, String purpose) {
        logger.info("==================================================");
        logger.info("DocuVault Security OTP Generated: [{}] for [{}] ({})", otp, toEmail, purpose);
        logger.info("==================================================");

        String subject = "DocuVault Verification Code: " + otp;
        String html = "<div style='font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #1E293B;'>"
                + "<div style='text-align: center; margin-bottom: 28px;'>"
                + "<div style='display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0D9488, #1E3A8A); line-height: 48px; font-size: 24px; margin-bottom: 12px;'>&#128737;</div>"
                + "<h1 style='color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;'>Docu<span style='color: #14B8A6;'>Vault</span></h1>"
                + "<p style='color: #94A3B8; font-size: 13px; margin: 6px 0 0 0;'>Smart Digital Document Locker &amp; Family Emergency Vault</p>"
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

        return sendHtmlEmail(toEmail, subject, html);
    }

    public boolean sendFamilyInvitationEmail(String toEmail, String inviterName, String vaultName, String token, java.util.Date expiresAt) {
        logger.info("Sending Family Vault Invitation to [{}] from [{}] for vault [{}]", toEmail, inviterName, vaultName);

        String subject = "DocuVault - You've been invited to join the " + vaultName + " Family Vault";
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEEE, MMMM d, yyyy");
        String expiryStr = (expiresAt != null) ? sdf.format(expiresAt) : "in 7 days";

        String html = "<div style='font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #1E293B;'>"
                + "<div style='text-align: center; margin-bottom: 24px;'>"
                + "<div style='display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0D9488, #1E3A8A); line-height: 48px; font-size: 24px; margin-bottom: 12px;'>&#128737;</div>"
                + "<h1 style='color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;'>Docu<span style='color: #14B8A6;'>Vault</span></h1>"
                + "<p style='color: #94A3B8; font-size: 13px; margin: 6px 0 0 0;'>Smart Digital Document Locker &amp; Family Vault</p>"
                + "</div>"
                + "<div style='background-color: #1E293B; padding: 24px 20px; border-radius: 14px; border: 1px solid #334155; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.3);'>"
                + "<p style='font-size: 15px; color: #E2E8F0; margin: 0 0 12px 0;'>Hello,</p>"
                + "<p style='font-size: 14px; color: #CBD5E1; line-height: 1.5; margin: 0 0 20px 0;'>"
                + "<strong style='color: #FFFFFF;'>" + inviterName + "</strong> has invited you to join their Family Vault: <strong style='color: #2DD4BF;'>&ldquo;" + vaultName + "&rdquo;</strong>."
                + "</p>"
                + "<div style='text-align: center; margin: 24px 0;'>"
                + "<a href='https://docuvault-spring-backend.onrender.com/api/v1/family/invite-redirect?token=" + token + "' style='display: block; max-width: 320px; margin: 0 auto; padding: 14px 28px; background: linear-gradient(135deg, #0D9488, #2563EB); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4); text-align: center;'>"
                + "&#128241; Accept in DocuVault App"
                + "</a>"
                + "<div style='margin-top: 10px;'>"
                + "<a href='docuvault://family?token=" + token + "' style='font-size: 12px; color: #2DD4BF; text-decoration: underline;'>"
                + "Or tap here to launch DocuVault app directly"
                + "</a>"
                + "</div>"
                + "</div>"
                + "<div style='background-color: #0F172A; border: 1px dashed #475569; border-radius: 10px; padding: 14px; margin: 20px 0; text-align: center;'>"
                + "<p style='font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; margin: 0 0 6px 0;'>Your Invitation Token</p>"
                + "<code style='font-family: monospace; font-size: 13px; color: #2DD4BF; word-break: break-all; font-weight: bold;'>" + token + "</code>"
                + "</div>"
                + "<p style='font-size: 12px; color: #94A3B8; line-height: 1.5; margin: 16px 0 0 0;'>"
                + "<b>How to accept:</b><br/>"
                + "1. Sign in to DocuVault with <b>" + toEmail + "</b>.<br/>"
                + "2. Go to <b>Family Vault</b> &rarr; tap <b>Enter Invitation Token</b>.<br/>"
                + "3. Paste the token above to instantly access shared family documents and emergency records."
                + "</p>"
                + "<p style='font-size: 12px; color: #E2E8F0; margin: 20px 0 0 0; padding-top: 14px; border-top: 1px solid #334155;'>"
                + "&#9203; This invitation is valid until <b>" + expiryStr + "</b>."
                + "</p>"
                + "</div>"
                + "<p style='font-size: 11px; color: #64748B; text-align: center; margin: 24px 0 0 0;'>If you did not expect this invitation, you can safely ignore this email.</p>"
                + "</div>";

        return sendHtmlEmail(toEmail, subject, html);
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String html) {
        // Priority 1: Brevo HTTP REST API (Port 443 - 300 free emails/day)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            return sendViaBrevo(toEmail, subject, html);
        }

        // Priority 2: Resend HTTP REST API (Port 443 - 100 free emails/day)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            return sendViaResend(toEmail, subject, html);
        }

        // Priority 3: JavaMailSender SMTP (Port 587 - Works on localhost or paid tiers)
        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            return sendViaSmtp(toEmail, subject, html);
        }

        logger.warn("No active email provider configured (Set BREVO_API_KEY or RESEND_API_KEY in Render).");
        return false;
    }

    private boolean sendViaBrevo(String toEmail, String subject, String html) {
        try {
            logger.info("Dispatching email to [{}] via Brevo HTTP REST API (Port 443)...", toEmail);
            String from = (mailFrom != null && !mailFrom.trim().isEmpty()) ? mailFrom.trim() : "takalaadentro@gmail.com";

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", "DocuVault Security");
            sender.put("email", from);

            Map<String, Object> recipient = new HashMap<>();
            recipient.put("email", toEmail);

            Map<String, Object> payload = new HashMap<>();
            payload.put("sender", sender);
            payload.put("to", Collections.singletonList(recipient));
            payload.put("subject", subject);
            payload.put("htmlContent", html);

            String json = (objectMapper != null) ? objectMapper.writeValueAsString(payload) : fallbackJson(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("api-key", brevoApiKey.trim())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(12))
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                logger.info("Successfully delivered email to [{}] via Brevo HTTP API (HTTP {})", toEmail, response.statusCode());
                return true;
            } else {
                logger.error("Brevo HTTP API rejected email (HTTP {}): {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            logger.error("Failed to send email via Brevo HTTP API: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean sendViaResend(String toEmail, String subject, String html) {
        try {
            logger.info("Dispatching email to [{}] via Resend HTTP REST API (Port 443)...", toEmail);
            String from = "DocuVault <onboarding@resend.dev>";
            if (mailFrom != null && mailFrom.contains("@") && !mailFrom.contains("gmail.com")) {
                from = "DocuVault <" + mailFrom.trim() + ">";
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("from", from);
            payload.put("to", Collections.singletonList(toEmail));
            payload.put("subject", subject);
            payload.put("html", html);

            String json = (objectMapper != null) ? objectMapper.writeValueAsString(payload) : fallbackJson(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(12))
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                logger.info("Successfully delivered email to [{}] via Resend HTTP API (HTTP {})", toEmail, response.statusCode());
                return true;
            } else {
                logger.error("Resend HTTP API rejected email (HTTP {}): {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            logger.error("Failed to send email via Resend HTTP API: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean sendViaSmtp(String toEmail, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "DocuVault Security");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            logger.info("Successfully delivered email to {} via SMTP", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to deliver email to {} via SMTP: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private String fallbackJson(Map<String, Object> map) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }
}
