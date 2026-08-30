"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Banknote, Edit3, History, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import EntryForm from "@/components/EntryForm";
import { useAuth } from "@/context/AuthContext";
import { addCredit, createBill, getLedger, listCustomers, updateCustomer, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function CustomerDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [customer, setCustomer] = useState(null); const [ledger, setLedger] = useState({ bills: [], credits: [], audits: [] });
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null);
  const load = useCallback(async () => { if (!user) return; const [people, all] = await Promise.all([listCustomers(user.uid), getLedger(user.uid)]); setCustomer(people.find((p) => p.id === id)); setLedger(all); }, [id, user]);
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([people, all]) => { setCustomer(people.find((p) => p.id === id)); setLedger(all); }); }, [id, user]);
  const bills = useMemo(() => ledger.bills.filter((b) => b.customerId === id).sort((a, b) => String(b.billDate).localeCompare(String(a.billDate))), [id, ledger.bills]);
  const billIds = useMemo(() => bills.map((b) => b.id), [bills]);
  const credits = useMemo(() => ledger.credits.filter((c) => billIds.includes(c.billId)).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))), [billIds, ledger.credits]);
  const total = bills.reduce((s, b) => s + Number(b.amount), 0); const paid = credits.reduce((s, c) => s + Number(c.amount), 0);
  async function saveBill(values) { await createBill(user.uid, id, values); setModal(null); await load(); }
  async function saveCredit(values) { await addCredit(user.uid, modal.billId, values); setModal(null); await load(); }
  async function saveCustomer(values, reason) { await updateCustomer(user.uid, id, customer, values, reason); setModal(null); await load(); }
  async function saveEdit(values, reason) { const collectionName = editing.type === "bill" ? "bills" : "credits"; await updateEntry(user.uid, collectionName, editing.item.id, editing.item, values, reason); setEditing(null); await load(); }
  if (!customer) return <AppShell title="Customer ledger" subtitle="Loading customer…"><div className="spinner" /></AppShell>;
  return <AppShell title={customer.name} subtitle={`${customer.billId} · ${customer.primaryContact}`} action={<button className="button secondary" onClick={() => setModal({ type: "customer" })}><Edit3 size={17}/> Edit details</button>}>
    <Link href="/customers" className="back-link"><ArrowLeft size={16}/> All customers</Link>
    <section className="ledger-summary"><article><span>Total billed</span><strong>{formatCurrency(total)}</strong></article><article><span>Total paid</span><strong className="green">{formatCurrency(paid)}</strong></article><article className="balance"><span>Balance left</span><strong>{formatCurrency(total - paid)}</strong></article></section>
    <div className="section-heading"><div><h2>Bills & installments</h2><p>Add payments against a specific bill and follow its timeline.</p></div><button className="button primary" onClick={() => setModal({ type: "bill" })}><Plus size={18}/> Add bill</button></div>
    <section className="bill-list">{bills.map((bill) => {
      const billCredits = credits.filter((c) => c.billId === bill.id); const billPaid = billCredits.reduce((s, c) => s + Number(c.amount), 0);
      return <article className="bill-card" key={bill.id}><div className="bill-head"><div className="bill-title"><span><ReceiptText/></span><div><h3>{bill.description}</h3><p>Generated {formatDate(bill.billDate)}</p></div></div><div className="bill-amount"><strong>{formatCurrency(bill.amount)}</strong><small>{formatCurrency(Number(bill.amount) - billPaid)} left</small></div></div>
        <div className="progress"><i style={{ width: `${Math.min(100, Number(bill.amount) ? billPaid / Number(bill.amount) * 100 : 0)}%` }}/></div>
        <div className="bill-actions"><span>{billCredits.length} installment{billCredits.length === 1 ? "" : "s"} · {formatCurrency(billPaid)} paid</span><button className="text-button" onClick={() => setEditing({ type: "bill", item: bill })}><Edit3 size={15}/> Correct bill</button><button className="button small" onClick={() => setModal({ type: "credit", billId: bill.id })}><Banknote size={16}/> Add payment</button></div>
        {!!billCredits.length && <div className="transactions">{billCredits.map((credit) => <div key={credit.id}><span className="transaction-icon"><Banknote size={17}/></span><div><strong>Payment received</strong><small>{formatDate(credit.paidAt)}{credit.note ? ` · ${credit.note}` : ""}</small></div><b>+ {formatCurrency(credit.amount)}</b><button onClick={() => setEditing({ type: "credit", item: credit })} aria-label="Correct payment"><Edit3 size={15}/></button></div>)}</div>}
      </article>;
    })}</section>
    {!bills.length && <div className="card empty-card"><div className="empty-icon"><ReceiptText/></div><h2>No bills yet</h2><p>Add a manually entered order amount to start this customer’s ledger.</p></div>}
    <button className="history-button" onClick={() => setModal({ type: "history" })}><History size={18}/> View correction history <span>{ledger.audits.filter((a) => a.entityId === id || billIds.includes(a.entityId) || credits.some((c) => c.id === a.entityId)).length}</span></button>
    <Modal open={modal?.type === "bill"} onClose={() => setModal(null)} title="Add a bill" subtitle={`Create a new bill for ${customer.name}.`}><EntryForm type="bill" onSubmit={saveBill}/></Modal>
    <Modal open={modal?.type === "credit"} onClose={() => setModal(null)} title="Record a payment" subtitle="Add a manual installment against this bill."><EntryForm type="credit" onSubmit={saveCredit}/></Modal>
    <Modal open={modal?.type === "customer"} onClose={() => setModal(null)} title="Correct customer details" subtitle="Every edit requires a reason and is recorded."><CustomerForm initial={customer} requireReason submitLabel="Save correction" onSubmit={saveCustomer}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={`Correct ${editing?.type || "entry"}`} subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type={editing.type} initial={editing.item} requireReason onSubmit={saveEdit}/>}</Modal>
    <Modal open={modal?.type === "history"} onClose={() => setModal(null)} title="Correction history" subtitle="A permanent trail of manual edits." wide><AuditHistory audits={ledger.audits} entityIds={[id, ...billIds, ...credits.map((c) => c.id)]}/></Modal>
  </AppShell>;
}

function AuditHistory({ audits, entityIds }) {
  const entries = audits.filter((a) => entityIds.includes(a.entityId)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  if (!entries.length) return <div className="empty-card"><div className="empty-icon"><History/></div><h3>No corrections made</h3><p>Any future edits and their reasons will appear here.</p></div>;
  return <div className="audit-list">{entries.map((audit) => <article key={audit.id}><div className="audit-dot"/><div><div className="audit-meta"><span>{audit.entityType} corrected</span><time>{formatDate(audit.createdAt)}</time></div><strong>{audit.reason}</strong>{audit.changes?.before?.amount !== undefined && <p>Amount corrected from <del>{formatCurrency(audit.changes.before.amount)}</del> to <b>{formatCurrency(audit.changes.after.amount)}</b></p>}<details><summary>View all changed data</summary><pre>{JSON.stringify(audit.changes, null, 2)}</pre></details></div></article>)}</div>;
}
