"use client";

import { Analytics as VercelAnalytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * /list?d=… links carry package names. Analytics only ever sees "/list", so
 * those names never leave the page — in line with the privacy notice.
 */
export function redactEvent(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  if (url.pathname === "/list") url.search = "";
  return { ...event, url: url.toString() };
}

/** Vercel Web Analytics: anonymous page views, no cookies. Does nothing in development. */
export function Analytics() {
  return <VercelAnalytics beforeSend={redactEvent} />;
}
