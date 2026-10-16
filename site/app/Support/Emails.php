<?php

namespace App\Support;

/** HTML of the e-mails the site sends. Values typed by people are escaped. */
class Emails
{
    private static function e($v): string
    {
        return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    }

    /** Dark branded frame used by the password and verification e-mails. */
    private static function dark(string $inner): string
    {
        return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0C;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#141416;border:1px solid #27272A;">
        <tr><td style="padding:40px 40px 24px 40px;text-align:center;">
          <h1 style="margin:0;color:#E9C4D7;font-size:28px;font-weight:normal;letter-spacing:2px;">Elite Escorts Europe</h1>
        </td></tr>
        <tr><td style="padding:0 40px 24px 40px;">
$inner
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #27272A;text-align:center;">
          <p style="margin:0;color:#52525B;font-size:12px;">Elite Escorts Europe &middot; Discreet. Curated. Exceptional.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
HTML;
    }

    public static function passwordReset(string $name, string $url): string
    {
        $n = self::e($name);
        $u = self::e($url);
        return self::dark(<<<HTML
          <h2 style="margin:0 0 16px 0;color:#F2F0ED;font-size:22px;font-weight:normal;">Reset your password</h2>
          <p style="margin:0 0 16px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">Hi $n,</p>
          <p style="margin:0 0 24px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">
            We received a request to reset your Elite Escorts Europe password. Tap the button below to choose a new one. This link expires in 24 hours.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr><td style="background-color:#E9C4D7;">
              <a href="$u" style="display:inline-block;padding:14px 36px;color:#0A0A0C;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Reset Password</a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0 0;color:#71717A;font-size:13px;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="$u" style="color:#E9C4D7;word-break:break-all;">$u</a>
          </p>
          <p style="margin:24px 0 0 0;color:#71717A;font-size:13px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email &mdash; your password won't change.
          </p>
HTML);
    }

    public static function confirmEmail(string $firstName, string $url): string
    {
        $n = self::e($firstName);
        $u = self::e($url);
        $p = config('eee.product_name');
        return <<<HTML
    <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; color:#1a1a1a; line-height:1.6;">
      <p>Hi $n,</p>
      <p>Thank you for signing up for $p! We're glad to have you on board.</p>
      <p>To finish setting up your account, please confirm that this is your email address:</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="$u" style="background:#832161; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:6px; font-weight:bold; display:inline-block;">Confirm my email</a>
      </p>
      <p style="color:#898989; font-size:13px;">This link expires in 24hrs. If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="$u" style="color:#832161; word-break:break-all;">$u</a>
      </p>
      <p>Your inbox stays yours. We only use your email address for things related to your account, like sign-in, security alerts, and important service updates. We never use it to send marketing emails, and we never share it with third parties.</p>
      <p>Didn't create an account? You can safely ignore this email. No account will be activated without confirmation.</p>
      <p>Thanks again,<br>Anouchka from $p</p>
    </div>
HTML;
    }

    public static function verificationDecision(string $name, bool $approved, ?string $reason): string
    {
        $n = self::e($name);
        if ($approved) {
            $headline = 'You’re verified';
            $body = 'Congratulations! Your Elite Escorts Europe provider profile has been verified and is now live on the marketplace with the Verified badge. Clients searching your city will now see your profile in their results.';
        } else {
            $headline = 'Verification needs attention';
            $r = self::e($reason ?: 'Documents did not meet requirements');
            $body = 'Unfortunately we couldn’t verify your identity with the documents submitted. You can resubmit any time from your dashboard.'
                ."<p style=\"margin:0 0 16px 0;color:#A1A1AA;font-size:14px;line-height:1.6;\"><strong style=\"color:#F2F0ED;\">Reason:</strong> $r</p>";
        }
        return self::dark(<<<HTML
          <h2 style="margin:0 0 16px 0;color:#F2F0ED;font-size:22px;font-weight:normal;">$headline</h2>
          <p style="margin:0 0 16px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">Hi $n,</p>
          <p style="margin:0 0 24px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">$body</p>
HTML);
    }

    public static function renewal(string $name, \DateTimeInterface $graceEnd, string $url): string
    {
        $n = self::e($name);
        $u = self::e($url);
        $when = $graceEnd->format('d F Y');
        $g = config('eee.grace_days');
        return <<<HTML
    <div style="font-family:Georgia,serif; max-width:560px; margin:0 auto; padding:32px; background:#FFFFFF; color:#000000;">
      <h1 style="font-size:22px; color:#832161; margin:0 0 16px;">Elite Escorts Europe</h1>
      <h2 style="font-size:18px; font-weight:normal; margin:0 0 16px;">Your listing is due for renewal</h2>
      <p style="line-height:1.6;">Hi $n,</p>
      <p style="line-height:1.6;">Your Featured listing has expired. It will stay visible on Browse until <strong>$when</strong>
        ($g-day grace period), after which it will be hidden from clients.</p>
      <p style="margin:24px 0 12px;">
        <a href="$u" style="display:inline-block; background:#DA4167; color:#FFFFFF; padding:12px 20px; text-decoration:none; font-weight:bold; letter-spacing:1px; text-transform:uppercase; font-size:13px;">Renew now</a>
      </p>
      <p style="color:#898989; font-size:12px; margin-top:32px;">Renewing during the grace period keeps your profile online without interruption.</p>
    </div>
HTML;
    }

    public static function enquiry(string $providerName, array $doc): string
    {
        $pn = self::e($providerName);
        $from = self::e($doc['name'] ?: 'Anonymous');
        $email = self::e($doc['email']);
        $msg = self::e($doc['message']);
        $replyName = self::e($doc['name'] ?: 'sender');
        return <<<HTML
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color:#000000;">
          <h2 style="color:#832161; margin:0 0 12px;">Elite Escorts Europe</h2>
          <p style="color:#DA4167; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin:0 0 24px;">New enquiry</p>
          <p>Hi $pn,</p>
          <p>You have received a new message via your public profile.</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr><td style="padding:8px 0; color:#898989; width:120px;">From</td><td style="padding:8px 0;"><strong>$from</strong></td></tr>
            <tr><td style="padding:8px 0; color:#898989;">Reply to</td><td style="padding:8px 0;"><a href="mailto:$email" style="color:#DA4167; text-decoration:none;">$email</a></td></tr>
          </table>
          <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0; white-space:pre-wrap;">$msg</div>
          <p style="margin:24px 0 12px;">
            <a href="mailto:$email?subject=Re: your enquiry on Elite Escorts Europe" style="display:inline-block; background:#DA4167; color:#FFFFFF; padding:12px 20px; text-decoration:none; font-weight:bold; letter-spacing:1px; text-transform:uppercase; font-size:13px;">Reply to $replyName</a>
          </p>
          <p style="color:#898989; font-size:12px; margin-top:32px;">
            Tip: just hit <em>Reply</em> on this email — your reply will go straight to the sender.<br/>
            You can also see this message on your Elite Escorts Europe dashboard.
          </p>
        </div>
HTML;
    }

    public static function enquiryReply(string $visitorName, string $providerName, string $text): string
    {
        $vn = self::e($visitorName ?: 'there');
        $pn = self::e($providerName);
        $msg = nl2br(self::e($text), false);
        return <<<HTML
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color:#000000;">
      <h2 style="color:#832161; margin:0 0 12px;">Elite Escorts Europe</h2>
      <p style="color:#DA4167; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin:0 0 24px;">Reply from your enquiry</p>
      <p>Hi $vn,</p>
      <p>$pn has replied to your enquiry:</p>
      <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0;">$msg</div>
      <p style="color:#898989; font-size:12px; margin-top:32px;">Reply directly to this email to continue the conversation.</p>
    </div>
HTML;
    }

    public static function report(array $doc): string
    {
        $name = self::e($doc['provider_name'] ?: $doc['provider_id']);
        $by = self::e($doc['reporter_name']).' &lt;'.self::e($doc['reporter_email']).'&gt;';
        $imgs = count($doc['images'] ?? []);
        $desc = self::e($doc['description']);
        $id = self::e($doc['report_id']);
        return <<<HTML
    <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; color:#1a1a1a;">
      <h2 style="color:#832161;">Profile reported as fake</h2>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:6px 0; color:#898989;">Profile</td><td style="padding:6px 0; font-weight:bold;">$name</td></tr>
        <tr><td style="padding:6px 0; color:#898989;">Reported by</td><td style="padding:6px 0;">$by</td></tr>
        <tr><td style="padding:6px 0; color:#898989;">Attachments</td><td style="padding:6px 0;">$imgs image(s)</td></tr>
      </table>
      <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0; white-space:pre-wrap;">$desc</div>
      <p style="color:#898989; font-size:12px; margin-top:24px;">Report ID: $id — reply to this email to reach the reporter.</p>
    </div>
HTML;
    }

    /** Short light e-mail: a photo/video or a custom service was not approved. */
    public static function notApproved(string $name, string $sentence, string $reason, string $after = ''): string
    {
        $n = self::e($name ?: 'there');
        $r = self::e($reason);
        $tail = $after ? '<p>'.self::e($after).'</p>' : '';
        return '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1B1820;">'
            .'<h2 style="color:#B04585;margin:0 0 12px;">Elite Escorts Europe</h2>'
            ."<p>Hi $n,</p><p>$sentence</p><p><strong>Reason:</strong> $r</p>$tail</div>";
    }

    public static function strong($v): string
    {
        return '<strong>'.self::e($v).'</strong>';
    }
}
