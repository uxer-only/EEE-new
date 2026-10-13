import 'server-only';
import { headers } from 'next/headers';

/** Forward the visitor's IP address to the backend, which uses it to sort Browse by distance. */
export async function visitorHeaders() {
  const h = await headers();
  const xff = h.get('x-forwarded-for') || h.get('x-real-ip') || '';
  return xff ? { 'x-forwarded-for': xff } : {};
}
