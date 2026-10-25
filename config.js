/* Coastlines settings. Edit this file, then reload the page. */
window.CL_CONFIG = {
  /* Live weather.
     Leave openWeatherKey empty to use Open-Meteo, which needs no key.
     Paste an OpenWeather API key (https://openweathermap.org/api) to use OpenWeather for air conditions instead.
     Wave and sea-level figures always come from Open-Meteo Marine.
     A key placed here is visible to anyone who views the page source. Restrict it to your site's domain in the
     OpenWeather dashboard, or route the request through your own server. */
  openWeatherKey: '',

  /* Show the demo member sign-in details on the sign-in page. Set to false before you publish for real use. */
  showDemoAccounts: true,

  /* Admins. There is no default admin account. Put the email addresses of the people who should review
     community reports and manage sites here, then register (or sign in) with that email. For example:
       adminEmails: ['you@example.org'],
     This list is read in the browser, so it is a convenience for a static site, not a security boundary.
     With a real server, assign the admin role there instead. See README.md. */
  adminEmails: [],

  /* Opening animation on the sign-in page (waves, loading bar, bubbles). It plays once per browser session and
     can be skipped. Set intro to false to remove it. introReplay: false keeps it but hides the "Replay intro" button. */
  intro: true,
  introReplay: true
};
