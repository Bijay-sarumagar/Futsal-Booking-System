import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle, Eye, MapPin, User, Calendar, Loader2 } from "lucide-react";
import { approveFutsal, getFutsals, rejectFutsal, type FutsalItem } from "../lib/api";
import { toast } from "sonner";

export function AdminFutsals() {
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
	const [loading, setLoading] = useState(true);
	const [futsalList, setFutsalList] = useState<FutsalItem[]>([]);
	const [actionTarget, setActionTarget] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
	const [selectedFutsal, setSelectedFutsal] = useState<FutsalItem | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		async function loadFutsals() {
			try {
				setLoading(true);
				const data = await getFutsals();
				setFutsalList(data);
			} catch {
				toast.error("Failed to load futsals");
			} finally {
				setLoading(false);
			}
		}

		loadFutsals();
	}, []);

	const filtered = useMemo(() => {
		return futsalList
			.filter((f) => statusFilter === "all" || f.approval_status === statusFilter)
			.filter((f) => {
			const text = `${f.futsal_name} ${f.location} ${f.owner_name}`.toLowerCase();
			return text.includes(query.toLowerCase());
			});
	}, [query, statusFilter, futsalList]);

	async function handleApprovalAction(futsalId: number, action: "approve" | "reject") {
		try {
			setActionLoading(true);
			if (action === "approve") {
				await approveFutsal(futsalId);
			} else {
				await rejectFutsal(futsalId);
			}

			setFutsalList((prev) =>
				prev.map((item) =>
					item.id === futsalId
						? { ...item, approval_status: action === "approve" ? "approved" : "rejected" }
						: item,
				),
			);
			toast.success(action === "approve" ? "Futsal approved" : "Futsal rejected");
			setActionTarget(null);
		} catch {
			toast.error("Failed to update futsal status");
		} finally {
			setActionLoading(false);
		}
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h2 className="text-2xl" style={{ fontWeight: 700 }}>Futsal Approvals</h2>
					<p className="text-muted-foreground text-sm">Review registered futsals and approve or reject submissions.</p>
				</div>
			</div>

			<div className="relative max-w-lg mb-6">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by futsal, location, or owner"
					className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white"
				/>
			</div>

			<div className="flex gap-2 mb-6">
				{(["all", "pending", "approved", "rejected"] as const).map((status) => (
					<button
						key={status}
						onClick={() => setStatusFilter(status)}
						className={`px-3 py-2 rounded-lg text-[0.8125rem] capitalize ${statusFilter === status ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}
					>
						{status}
					</button>
				))}
			</div>

			<div className="overflow-hidden rounded-xl border bg-white">
				<table className="w-full text-sm">
					<thead className="bg-muted/50">
						<tr>
							<th className="text-left px-4 py-3">Futsal</th>
							<th className="text-left px-4 py-3">Owner</th>
							<th className="text-left px-4 py-3">Location</th>
							<th className="text-left px-4 py-3">Price/hr</th>
							<th className="text-left px-4 py-3">Status</th>
							<th className="text-left px-4 py-3">Action</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr className="border-t">
								<td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading futsals...</td>
							</tr>
						) : null}
						{filtered.map((f) => (
							<tr key={f.id} className="border-t">
								<td className="px-4 py-3" style={{ fontWeight: 600 }}>{f.futsal_name}</td>
								<td className="px-4 py-3">{f.owner_name}</td>
								<td className="px-4 py-3">{f.location}</td>
								<td className="px-4 py-3">N/A</td>
								<td className="px-4 py-3 capitalize">
									<span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${
										f.approval_status === "approved"
											? "bg-emerald-100 text-emerald-700"
											: f.approval_status === "pending"
											? "bg-yellow-100 text-yellow-700"
											: "bg-red-100 text-red-700"
									}`}
									>
										{f.approval_status}
									</span>
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-2 flex-wrap">
										<button onClick={() => setSelectedFutsal(f)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 hover:bg-muted">
											<Eye className="w-4 h-4" /> View
										</button>
										<button onClick={() => setActionTarget({ id: f.id, action: "approve" })} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700">
											<CheckCircle2 className="w-4 h-4" /> Approve
										</button>
										<button onClick={() => setActionTarget({ id: f.id, action: "reject" })} className="inline-flex items-center gap-1 rounded-md bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700">
											<XCircle className="w-4 h-4" /> Reject
										</button>
									</div>
								</td>
							</tr>
						))}
						{!loading && filtered.length === 0 ? (
							<tr className="border-t">
								<td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No futsals found.</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			{actionTarget ? (
				<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
						<div className="flex items-center justify-between mb-3">
							<h3>{actionTarget.action === "approve" ? "Approve Futsal" : "Reject Futsal"}</h3>
							<button onClick={() => setActionTarget(null)} className="p-1 rounded hover:bg-muted"><XCircle className="w-4 h-4" /></button>
						</div>
						<p className="text-[0.875rem] text-muted-foreground mb-6">
							{actionTarget.action === "approve"
								? "This action will make the futsal visible to players and available for booking."
								: "This action will reject this futsal submission and hide it from player listings."}
						</p>
						<div className="flex justify-end gap-2">
							<button onClick={() => setActionTarget(null)} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
								Cancel
							</button>
							<button
								disabled={actionLoading}
								onClick={() => handleApprovalAction(actionTarget.id, actionTarget.action)}
								className={`px-4 py-2 rounded-lg text-[0.875rem] text-white inline-flex items-center gap-2 ${actionTarget.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
							>
								{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
								Confirm
							</button>
						</div>
					</div>
				</div>
			) : null}

			{selectedFutsal ? (
				<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-border">
						<div className="relative h-56 md:h-72">
							<img
								src={selectedFutsal.image || "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1600&q=80"}
								alt={selectedFutsal.futsal_name}
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
							<div className="absolute top-4 right-4">
								<button onClick={() => setSelectedFutsal(null)} className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30">
									<XCircle className="w-4 h-4" />
								</button>
							</div>
							<div className="absolute bottom-5 left-5 text-white">
								<p className="text-[0.75rem] uppercase tracking-[0.12em] text-blue-100">Futsal Submission</p>
								<h3 className="text-[1.625rem] mt-1" style={{ fontWeight: 700 }}>{selectedFutsal.futsal_name}</h3>
								<p className="text-[0.875rem] text-white/90 inline-flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {selectedFutsal.location}</p>
							</div>
						</div>

						<div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
							<div className="lg:col-span-2 space-y-4">
								<div className="rounded-xl border border-border p-4">
									<h4 className="text-[0.875rem] mb-2">Overview</h4>
									<p className="text-[0.875rem] text-muted-foreground">{selectedFutsal.description || "No description provided by owner."}</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="rounded-xl border border-border p-4">
										<h4 className="text-[0.875rem] mb-2">Owner Information</h4>
										<p className="text-[0.8125rem] text-muted-foreground inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {selectedFutsal.owner_name}</p>
										<p className="text-[0.8125rem] text-muted-foreground mt-1">Owner ID: {selectedFutsal.owner}</p>
									</div>

									<div className="rounded-xl border border-border p-4">
										<h4 className="text-[0.875rem] mb-2">Submission Details</h4>
										<p className="text-[0.8125rem] text-muted-foreground inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Submitted: {selectedFutsal.created_at.slice(0, 10)}</p>
									</div>
								</div>

								<div className="rounded-xl border border-border p-4">
									<h4 className="text-[0.875rem] mb-2">Amenities</h4>
									<div className="flex flex-wrap gap-2">
										{(selectedFutsal.amenities?.length ? selectedFutsal.amenities : ["Not specified"]).map((item) => (
											<span key={item} className="px-2.5 py-1 rounded-lg border border-border text-[0.75rem] bg-muted/40">{item}</span>
										))}
									</div>
								</div>
							</div>

							<div className="rounded-xl border border-border p-4 h-fit lg:sticky lg:top-4">
								<p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide mb-1">Review Decision</p>
								<p className="text-[0.875rem] mb-3" style={{ fontWeight: 600 }}>Current status</p>
								<span className={`inline-flex px-2.5 py-1 rounded-full text-[0.75rem] mb-4 capitalize ${
									selectedFutsal.approval_status === "approved"
										? "bg-emerald-100 text-emerald-700"
										: selectedFutsal.approval_status === "pending"
										? "bg-yellow-100 text-yellow-700"
										: "bg-red-100 text-red-700"
								}`}>
									{selectedFutsal.approval_status}
								</span>

								<div className="space-y-2">
									<button onClick={() => setActionTarget({ id: selectedFutsal.id, action: "approve" })} className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-[0.875rem] hover:bg-emerald-700">
										Approve
									</button>
									<button onClick={() => setActionTarget({ id: selectedFutsal.id, action: "reject" })} className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white text-[0.875rem] hover:bg-rose-700">
										Reject
									</button>
									<button onClick={() => setSelectedFutsal(null)} className="w-full px-4 py-2 rounded-lg border border-border text-[0.875rem] hover:bg-muted">
										Close
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
