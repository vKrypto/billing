"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import { useAuth } from "@/context/AuthContext";
import { createCustomer, getLedger, listCustomers } from "@/services/billingService";
import { formatCurrency } from "@/lib/formatters";

export default function CustomersPage() {
  const { user } = useAuth(); const [customers, setCustomers] = useState([]); const [ledger, setLedger] = useState({ bills: [], credits: [] });
  const [open, setOpen] = useState(false); const [search, setSearch] = useState("");
  const load = useCallback(async () => { if (!user) return; const [people, entries] = await Promise.all([listCustomers(user.uid), getLedger(user.uid)]); setCustomers(people); setLedger(entries); }, [user]);
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([people, entries]) => { setCustomers(people); setLedger(entries); }); }, [user]);
  const filtered = customers.filter((c) => `${c.name} ${c.primaryContact} ${c.billId}`.toLowerCase().includes(search.toLowerCase()));
  const balance = useMemo(() => (customerId) => {
    const ids = ledger.bills.filter((b) => b.customerId === customerId).map((b) => b.id);
    return ledger.bills.filter((b) => b.customerId === customerId).reduce((s, b) => s + Number(b.amount), 0) - ledger.credits.filter((c) => ids.includes(c.billId)).reduce((s, c) => s + Number(c.amount), 0);
  }, [ledger]);
  async function add(values) { await createCustomer(user.uid, values); setOpen(false); await load(); }
  return <AppShell title="Customers" subtitle="Every person, bill, and payment in one clear place." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={18}/> Add customer</button>}>
    <div className="toolbar"><div className="search"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, contact, or bill ID" /></div><span>{filtered.length} customers</span></div>
    <section className="customer-grid">{filtered.map((customer) => <Link href={`/customers/${customer.id}`} className="customer-card" key={customer.id}><div className="customer-top"><div className="person-icon"><UserRound/></div><span className={balance(customer.id) > 0 ? "badge pending" : "badge paid"}>{balance(customer.id) > 0 ? "Pending" : "Settled"}</span></div><h3>{customer.name}</h3><p>{customer.primaryContact}</p><div className="card-footer"><span>{customer.billId}</span><strong>{formatCurrency(balance(customer.id))}</strong></div></Link>)}</section>
    {!filtered.length && <div className="card empty-card"><div className="empty-icon"><UserRound/></div><h2>No customers found</h2><p>Add your first customer to begin a billing ledger.</p></div>}
    <Modal open={open} onClose={() => setOpen(false)} title="Add a customer" subtitle="The first three fields are mandatory."><CustomerForm onSubmit={add}/></Modal>
  </AppShell>;
}
