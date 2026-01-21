import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Search, XCircle, Eye, Loader2 } from "lucide-react";
import { approveFutsal, getFutsals, rejectFutsal, type FutsalItem } from "../lib/api";
import { toast } from "sonner";

export function AdminFutsals() {
	const navigate = useNavigate();
	const location = useLocation();
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
	const [loading, setLoading] = useState(true);
	const [futsalList, setFutsalList] = useState<FutsalItem[]>([]);
	const [actionTarget, setActionTarget] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
	const [actionLoading, setActionLoading] = useState(false);
	const adminBasePath = location.pathname.startsWith("/admin") ? "/admin" : "/super-admin";

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
		<div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h1>Futsal Approvals</h1>
					<p className="text-muted-foreground text-sm mt-1">Review registered futsals and approve or reject submissions.</p>
				</div>
			</div>

			<div className="relative max-w-lg mb-6">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by futsal, location, or owner"
					className="w-full pl-10 pr-4 py-2.5 min-h-11 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				/>
			</div>

			<div className="flex flex-wrap gap-2 mb-6">
				{(["all", "pending", "approved", "rejected"] as const).map((status) => (
					<button
						type="button"
						key={status}
						onClick={() => setStatusFilter(status)}
						className={`px-3 py-2 min-h-10 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
							statusFilter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
						}`}
					>
						{status}
					</button>
				))}
			</div>

			<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
				<table className="w-full text-sm min-w-[860px]">
					<thead className="bg-muted/60 border-b border-border">
						<tr>
							<th className="text-left pl-5 pr-4 py-3 font-medium text-muted-foreground w-[220px]">Futsal</th>
							<th className="text-left pl-5 pr-4 py-3 font-medium text-muted-foreground w-[190px]">Owner</th>
							<th className="text-left pl-8 pr-4 py-3 font-medium text-muted-foreground w-[32%]">Location</th>
							<th className="text-left pl-7 pr-4 py-3 font-medium text-muted-foreground">Price/hr</th>
							<th className="text-left pl-7 pr-4 py-3 font-medium text-muted-foreground">Status</th>
							<th className="pl-6 pr-5 py-3 font-medium text-muted-foreground">
								<div className="flex justify-end">
									<span className="inline-block w-[252px] text-left">Action</span>
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr className="border-t border-border">
								<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading futsals…</td>
							</tr>
						) : null}
						{filtered.map((f) => (
							<tr key={f.id} className="border-t border-border hover:bg-muted/30 transition-colors">
								<td className="pl-5 pr-4 py-3 font-semibold whitespace-nowrap">{f.futsal_name}</td>
								<td className="pl-5 pr-4 py-3 whitespace-nowrap">{f.owner_name}</td>
								<td className="pl-8 pr-4 py-3 text-muted-foreground">{f.location}</td>
								<td className="pl-7 pr-4 py-3 text-muted-foreground">N/A</td>
								<td className="pl-7 pr-4 py-3 capitalize">
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
											f.approval_status === "approved"
												? "bg-primary/10 text-primary border-primary/20"
												: f.approval_status === "pending"
													? "bg-amber-50 text-amber-900 border-amber-200/80"
													: "bg-destructive/10 text-destructive border-destructive/20"
										}`}
									>
										{f.approval_status}
									</span>
								</td>
								<td className="pl-6 pr-5 py-3">
									<div className="flex items-center justify-end gap-2 flex-nowrap">
										<button
											type="button"
											onClick={() => navigate(`${adminBasePath}/futsals/${f.id}`)}
											className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-3 py-2 min-h-9 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<Eye className="w-4 h-4 shrink-0" /> View
										</button>
										<button
											type="button"
											onClick={() => setActionTarget({ id: f.id, action: "approve" })}
											className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-primary text-primary-foreground px-3 py-2 min-h-9 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<CheckCircle2 className="w-4 h-4 shrink-0" /> Approve
										</button>
										<button
											type="button"
											onClick={() => setActionTarget({ id: f.id, action: "reject" })}
											className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-destructive text-destructive-foreground px-3 py-2 min-h-9 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<XCircle className="w-4 h-4 shrink-0" /> Reject
										</button>
									</div>
								</td>
							</tr>
						))}
						{!loading && filtered.length === 0 ? (
							<tr className="border-t border-border">
								<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No futsals found.</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			{actionTarget ? (
				<div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
					<div className="bg-card rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
						<div className="flex items-center justify-between gap-3 mb-3">
							<h3 className="text-base font-semibold flex items-center gap-2">
								<button type="button" onClick={() => setActionTarget(null)} className="p-1 rounded hover:bg-muted" aria-label="Back">
									<ArrowLeft className="w-4 h-4" />
								</button>
								{actionTarget.action === "approve" ? "Approve Futsal" : "Reject Futsal"}
							</h3>
							<button type="button" onClick={() => setActionTarget(null)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
								<XCircle className="w-4 h-4" />
							</button>
						</div>
						<p className="text-sm text-muted-foreground mb-6 leading-relaxed">
							{actionTarget.action === "approve"
								? "This action will make the futsal visible to players and available for booking."
								: "This action will reject this futsal submission and hide it from player listings."}
						</p>
						<div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
							<button
								type="button"
								onClick={() => setActionTarget(null)}
								className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={actionLoading}
								onClick={() => handleApprovalAction(actionTarget.id, actionTarget.action)}
								className={`px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
									actionTarget.action === "approve" ? "bg-primary hover:opacity-90" : "bg-destructive hover:opacity-90"
								}`}
							>
								{actionLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
								Confirm
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
