// Cloudflare Pages Function: trusted edge geolocation, never a browser-supplied country.
export function onRequestGet({request}) {
  const country = request.cf?.country || null;
  const mapping = {US:'US',JP:'JP',GB:'UK',DE:'DE',CA:'CA'};
  return Response.json({market:mapping[country] || 'US',supported:!!mapping[country],detected:!!country}, {headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}
