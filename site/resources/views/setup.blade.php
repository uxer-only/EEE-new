{{-- One-time setup page (app/Http/Controllers/SetupController.php). Kept standalone: it must work before the database exists. --}}
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Set up Elite Escorts Europe</title>
<style>
  body { margin: 0; min-height: 100vh; background: #0A0A0C; color: #F3EFE8; font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .box { width: 100%; max-width: 440px; background: #17121A; border: 1px solid #2B2430; border-radius: 12px; padding: 28px; }
  h1 { font: 600 24px Georgia, serif; margin: 0 0 6px; }
  p { color: #B9B1BD; margin: 0 0 18px; font-size: 14px; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 8px; border: 1px solid #3A3140; background: #0F0C11; color: #fff; font-size: 15px; }
  input:focus { outline: none; border-color: #B04585; box-shadow: 0 0 0 3px rgba(176,69,133,.25); }
  button { margin-top: 20px; width: 100%; padding: 12px; border: 0; border-radius: 8px; background: #B04585; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
  .err { background: #3A1420; border: 1px solid #7A2440; color: #FFD6E0; padding: 10px 12px; border-radius: 8px; font-size: 14px; margin-bottom: 8px; }
  .ok { background: #12301F; border: 1px solid #2F7A55; color: #D8F5E4; padding: 12px; border-radius: 8px; font-size: 14px; }
  .ok ol { margin: 8px 0 0 18px; padding: 0; }
  a { color: #E9C4D7; }
</style>
</head>
<body>
<div class="box">
@if ($done)
  <h1>Setup complete</h1>
  <div class="ok">
    The database tables are ready and the administrator <strong>{{ $done['email'] }}</strong> was created.
    <ol>
      <li>Remove the line <code>SETUP_TOKEN=…</code> from the <code>.env</code> file (this page is already switched off).</li>
      <li>Log in at <a href="/admin/login">/admin/login</a>.</li>
    </ol>
  </div>
@else
  <h1>Set up the site</h1>
  <p>Creates the database tables and your administrator account. This page works once and then switches itself off.</p>
  @if ($error)<div class="err">{{ $error }}</div>@endif
  <form method="post" action="/setup" autocomplete="off">
    <label for="token">Setup code (SETUP_TOKEN in .env)</label>
    <input id="token" name="token" type="password" required>
    <label for="email">Administrator e-mail</label>
    <input id="email" name="email" type="email" value="{{ $email }}" required>
    <label for="password">Password (at least 12 characters)</label>
    <input id="password" name="password" type="password" minlength="12" required autocomplete="new-password">
    <label for="password_again">Password again</label>
    <input id="password_again" name="password_again" type="password" minlength="12" required autocomplete="new-password">
    <button type="submit">Set up the site</button>
  </form>
@endif
</div>
</body>
</html>
