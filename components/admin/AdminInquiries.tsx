"use client";

import { useState } from "react";

// Read-only view of custom-stick inquiries (clubs / schools / teams) and
// general contact messages. Submissions come in from /clubs and /contact;
// the owner replies by email — nothing to edit here.

export type InquiryRow = {
  id: string;
  orgType: string;
  clubName: string;
  contact: string;
  email: string;
  message: string;
  createdAt: string; // ISO
};

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string; // ISO
};

const ORG_LABEL: Record<string, string> = {
  CLUB: "Club",
  SCHOOL: "School",
  TEAM: "Team",
  OTHER: "Other",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminInquiries({
  inquiries,
  contacts,
}: {
  inquiries: InquiryRow[];
  contacts: ContactRow[];
}) {
  const [tab, setTab] = useState<"inquiries" | "contacts">("inquiries");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-black">Custom Stick Inquiries</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("inquiries")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${tab === "inquiries" ? "bg-ink text-paper" : "bg-black/10 text-black/50"}`}
          >
            Clubs / Schools / Teams ({inquiries.length})
          </button>
          <button
            onClick={() => setTab("contacts")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${tab === "contacts" ? "bg-ink text-paper" : "bg-black/10 text-black/50"}`}
          >
            Contact Messages ({contacts.length})
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-black/50">
        Custom-stick requests from the /clubs form and general messages from
        the contact page. Reply by email; click a row for the full message.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        {tab === "inquiries" ? (
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-black/40">
                    No inquiries yet.
                  </td>
                </tr>
              )}
              {inquiries.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => setOpenId(openId === q.id ? null : q.id)}
                  className="cursor-pointer border-b border-black/5 align-top last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="whitespace-nowrap p-3 text-black/50">{fmtDate(q.createdAt)}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-volt/30 px-2 py-0.5 text-xs font-bold text-ink">
                      {ORG_LABEL[q.orgType] ?? q.orgType}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{q.clubName}</td>
                  <td className="p-3">
                    <div>{q.contact}</div>
                    <a href={`mailto:${q.email}`} className="text-xs text-volt-dark underline" onClick={(e) => e.stopPropagation()}>
                      {q.email}
                    </a>
                  </td>
                  <td className="max-w-md p-3 text-black/60">
                    <span className={openId === q.id ? "" : "line-clamp-2"}>{q.message}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs uppercase text-black/40">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">From</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-black/40">
                    No messages yet.
                  </td>
                </tr>
              )}
              {contacts.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setOpenId(openId === m.id ? null : m.id)}
                  className="cursor-pointer border-b border-black/5 align-top last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="whitespace-nowrap p-3 text-black/50">{fmtDate(m.createdAt)}</td>
                  <td className="p-3">
                    <div className="font-semibold">{m.name}</div>
                    <a href={`mailto:${m.email}`} className="text-xs text-volt-dark underline" onClick={(e) => e.stopPropagation()}>
                      {m.email}
                    </a>
                  </td>
                  <td className="p-3">{m.subject}</td>
                  <td className="max-w-md p-3 text-black/60">
                    <span className={openId === m.id ? "" : "line-clamp-2"}>{m.message}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
