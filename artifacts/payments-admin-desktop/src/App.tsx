import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  authApi,
  adminApi,
  type Payment,
  type AdminUser,
  PAYMENT_METHODS,
  METHOD_LABELS,
  ROLES,
  ROLE_LABELS,
  SEDES,
  SEDE_LABELS,
  SUBSCRIPTION_LEVELS,
  SUBSCRIPTION_LABELS,
  getApiUrl,
  setApiUrl,
} from "./api";

// ─── Login Screen ─────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setApiUrl(apiUrl);
      const { user } = await authApi.login(email, password);
      if (!user.roles.includes("admin")) {
        setError("Solo administradores pueden acceder");
        return;
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <form onSubmit={handleSubmit} className="bg-zinc-900 p-8 rounded-xl w-96 border border-zinc-800">
        <h1 className="text-2xl font-bold text-gold text-center mb-1">忍 SHINOBI IGA RYU</h1>
        <p className="text-zinc-500 text-center text-sm mb-6">Panel de Pagos</p>

        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Email</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 mb-4 text-white outline-none focus:border-gold"
          required
        />
        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Contraseña</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 mb-4 text-white outline-none focus:border-gold"
          required
        />
        <button
          type="submit" disabled={loading}
          className="w-full bg-gold text-black font-bold py-2.5 rounded hover:bg-gold-dark disabled:opacity-50 transition"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <button type="button" onClick={() => setShowConfig(!showConfig)} className="w-full text-zinc-600 text-xs mt-3 hover:text-zinc-400">
          {showConfig ? "Ocultar" : "Configurar"} servidor
        </button>
        {showConfig && (
          <input
            value={apiUrl} onChange={(e) => setApiUrlState(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 mt-2 text-zinc-400 text-sm outline-none focus:border-gold"
            placeholder="https://tu-api.com"
          />
        )}
      </form>
    </div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────

function PaymentModal({
  payment,
  users,
  preselectedUserId,
  onSave,
  onClose,
}: {
  payment: Payment | null; // null = new
  users: AdminUser[];
  preselectedUserId?: number;
  onSave: (data: { userId: number; paymentDate: string; expiresDate: string; amount?: number; paymentMethod: string; subscriptionLevel?: string; notes?: string }, id?: number) => Promise<void>;
  onClose: () => void;
}) {
  const preselectedUser = preselectedUserId ? users.find(u => u.id === preselectedUserId) : null;
  const [userId, setUserId] = useState(payment?.userId ?? preselectedUserId ?? 0);
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate ?? new Date().toISOString().slice(0, 10));
  const [expiresDate, setExpiresDate] = useState(payment?.expiresDate ?? "");
  const [method, setMethod] = useState(payment?.paymentMethod ?? "nequi");
  const [subLevel, setSubLevel] = useState(payment?.subscriptionLevel ?? preselectedUser?.subscriptionLevel ?? "basico");
  const [amount, setAmount] = useState(payment?.amount?.toString() ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Auto-calculate expiresDate = paymentDate + 30 days when paymentDate changes
  useEffect(() => {
    if (!payment && paymentDate && !expiresDate) {
      const d = new Date(paymentDate + "T12:00:00");
      d.setDate(d.getDate() + 30);
      setExpiresDate(d.toISOString().slice(0, 10));
    }
  }, [paymentDate, payment, expiresDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { setError("Selecciona un usuario"); return; }
    if (!paymentDate || !expiresDate) { setError("Las fechas son obligatorias"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(
        {
          userId,
          paymentDate,
          expiresDate,
          amount: amount ? parseInt(amount) : undefined,
          paymentMethod: method,
          subscriptionLevel: subLevel,
          notes: notes || undefined,
        },
        payment?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const showUserSelector = !payment && !preselectedUserId;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-[480px] max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold text-gold mb-4">
          {payment ? "Editar Pago" : preselectedUserId ? `Nuevo Pago — ${users.find(u => u.id === preselectedUserId)?.displayName ?? ""}` : "Nuevo Pago"}
        </h2>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-3 py-2 rounded mb-3 text-sm">{error}</div>}

        {/* User selector */}
        {payment ? (
          <div className="bg-zinc-800 px-3 py-2 rounded mb-3 text-zinc-300 text-sm">{payment.userName ?? `ID: ${payment.userId}`}</div>
        ) : showUserSelector ? (
          <>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Usuario</label>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 mb-1 text-white text-sm outline-none focus:border-gold"
            />
            <select
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 mb-3 text-white outline-none focus:border-gold"
              size={Math.min(filteredUsers.length + 1, 6)}
            >
              <option value={0}>— Seleccionar —</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} {u.nickname ? `(${u.nickname})` : ""} — {u.email}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Fecha de Pago</label>
            <input
              type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Vencimiento</label>
            <input
              type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
            />
          </div>
        </div>

        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Método de Pago</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m} type="button"
              onClick={() => setMethod(m)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                method === m
                  ? "bg-gold text-black border-gold"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>

        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Paquete</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {SUBSCRIPTION_LEVELS.map((l) => (
            <button
              key={l} type="button"
              onClick={() => setSubLevel(l)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                subLevel === l
                  ? "bg-gold text-black border-gold"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {SUBSCRIPTION_LABELS[l]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Monto (COP)</label>
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Notas</label>
            <input
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-zinc-400 py-2 rounded hover:bg-zinc-700 transition">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-gold text-black font-bold py-2 rounded hover:bg-gold-dark disabled:opacity-50 transition">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── User Modal (create / edit) ───────────────────────────────

type ChildEntry = { key: string; name: string; email: string; phone: string };

function UserModal({
  user,
  users,
  prefilledParentId,
  onSave,
  onClose,
}: {
  user: AdminUser | null; // null = create
  users: AdminUser[];
  prefilledParentId?: number;
  onSave: () => Promise<void>;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [roles, setRoles] = useState<string[]>(user?.roles ?? ["alumno"]);
  const [sedes, setSedes] = useState<string[]>(user?.sedes ?? []);
  const [subscriptionLevel, setSubscriptionLevel] = useState(user?.subscriptionLevel ?? "basico");
  const [isFighter, setIsFighter] = useState(user?.isFighter ?? false);
  const [parentId, setParentId] = useState<number | null>(user?.parentId ?? prefilledParentId ?? null);
  const [parentSearch, setParentSearch] = useState("");
  const [pendingChildren, setPendingChildren] = useState<ChildEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Candidates for parent: all users that aren't this user and aren't already children
  const parentCandidates = useMemo(() => {
    const q = parentSearch.toLowerCase();
    return users.filter((u) =>
      u.id !== user?.id &&
      u.parentId == null && // only root users can be parents
      (u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, parentSearch, user?.id]);

  const selectedParent = parentId ? users.find((u) => u.id === parentId) : null;

  // Children of this user (when editing)
  const existingChildren = useMemo(
    () => (user ? users.filter((u) => u.parentId === user.id) : []),
    [users, user]
  );

  const addPendingChild = () =>
    setPendingChildren((prev) => [...prev, { key: Math.random().toString(36).slice(2), name: "", email: "", phone: "" }]);

  const removePendingChild = (key: string) =>
    setPendingChildren((prev) => prev.filter((c) => c.key !== key));

  const updatePendingChild = (key: string, field: keyof Omit<ChildEntry, "key">, value: string) =>
    setPendingChildren((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));

  const toggleRole = (r: string) => {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };
  const toggleSede = (s: string) => {
    setSedes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError("El nombre es obligatorio"); return; }
    if (roles.length === 0) { setError("Selecciona al menos un rol"); return; }
    setSaving(true);
    setError("");
    try {
      let savedUserId: number;
      if (user) {
        // Update existing user — multiple endpoints in parallel
        const updates: Promise<unknown>[] = [];
        updates.push(adminApi.updateUser(user.id, {
          displayName: displayName.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          phone: phone.trim() || undefined,
          isFighter,
          sedes,
          parentId: parentId ?? null,
          ...(password ? { password } : {}),
        }));
        if (JSON.stringify([...roles].sort()) !== JSON.stringify([...(user.roles ?? [])].sort())) {
          updates.push(adminApi.updateUserRoles(user.id, roles));
        }
        if (subscriptionLevel !== user.subscriptionLevel) {
          updates.push(adminApi.updateUserSubscription(user.id, subscriptionLevel));
        }
        await Promise.all(updates);
        savedUserId = user.id;
      } else {
        // Create new user
        const res = await adminApi.createUser({
          displayName: displayName.trim(),
          email: email.trim() || undefined, // server generates placeholder if empty
          password: password || undefined,
          phone: phone.trim() || undefined,
          roles,
          subscriptionLevel,
          isFighter,
          sedes,
          parentId: parentId ?? null,
        });
        savedUserId = res.user.id;
      }

      // Create pending children
      for (const child of pendingChildren) {
        if (!child.name.trim()) continue;
        await adminApi.createUser({
          displayName: child.name.trim(),
          email: child.email.trim() || undefined,
          phone: child.phone.trim() || undefined,
          roles: ["alumno"],
          parentId: savedUserId,
        });
      }

      await onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-[520px] max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold text-gold mb-4">{user ? "Editar Usuario" : "Nuevo Usuario"}</h2>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-3 py-2 rounded mb-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Nombre completo *</label>
            <input
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder="Ej: Johan Rincón"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">
              Email <span className="text-zinc-600 normal-case">(vacío = sin cuenta)</span>
            </label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">
              Contraseña {user ? "(dejar vacío para no cambiar)" : "(vacío = Ninja123)"}
            </label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder={user ? "••••••" : "Ninja123"}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Teléfono</label>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-gold"
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Roles */}
        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Roles *</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {ROLES.map((r) => (
            <button
              key={r} type="button"
              onClick={() => toggleRole(r)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                roles.includes(r)
                  ? r === "admin" ? "bg-red-900/50 text-red-300 border-red-700" : "bg-gold text-black border-gold"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Sedes */}
        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Sedes</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {SEDES.map((s) => (
            <button
              key={s} type="button"
              onClick={() => toggleSede(s)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                sedes.includes(s)
                  ? "bg-gold text-black border-gold"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {SEDE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Subscription level */}
        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Tipo de suscripción</label>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {SUBSCRIPTION_LEVELS.map((l) => (
            <button
              key={l} type="button"
              onClick={() => setSubscriptionLevel(l)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                subscriptionLevel === l
                  ? "bg-gold text-black border-gold"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {SUBSCRIPTION_LABELS[l]}
            </button>
          ))}
        </div>

        {/* Fighter toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setIsFighter(!isFighter)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isFighter ? "bg-gold" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isFighter ? "left-5" : "left-0.5"}`} />
          </button>
          <span className="text-sm text-zinc-300">Luchador</span>
        </div>

        {/* ── Acudiente (parent) ── */}
        <div className="border-t border-zinc-800 pt-4 mb-3">
          <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">Acudiente / Responsable</label>
          {selectedParent ? (
            <div className="flex items-center gap-2 bg-zinc-800 rounded px-3 py-2 mb-2">
              <span className="text-white text-sm flex-1">{selectedParent.displayName}</span>
              <span className="text-zinc-500 text-xs">{selectedParent.email}</span>
              <button type="button" onClick={() => { setParentId(null); setParentSearch(""); }}
                className="text-zinc-500 hover:text-red-400 text-xs ml-2">✕</button>
            </div>
          ) : (
            <>
              <input
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                placeholder="Buscar acudiente por nombre o email..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 mb-1 text-white text-sm outline-none focus:border-gold"
              />
              {parentSearch && (
                <div className="bg-zinc-800 border border-zinc-700 rounded max-h-36 overflow-y-auto mb-2">
                  {parentCandidates.length === 0 ? (
                    <div className="px-3 py-2 text-zinc-500 text-xs">Sin resultados</div>
                  ) : parentCandidates.map((u) => (
                    <button key={u.id} type="button"
                      onClick={() => { setParentId(u.id); setParentSearch(""); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 transition flex items-center justify-between"
                    >
                      <span>{u.displayName}</span>
                      <span className="text-zinc-500 text-xs">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {!parentSearch && <p className="text-zinc-600 text-xs mb-2">Sin acudiente asignado</p>}
            </>
          )}
        </div>

        {/* ── Hijos existentes (only in edit mode) ── */}
        {user && existingChildren.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 mb-3">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Hijos vinculados ({existingChildren.length})
            </label>
            <div className="space-y-1">
              {existingChildren.map((child) => (
                <div key={child.id} className="flex items-center gap-2 bg-zinc-800/60 rounded px-3 py-1.5">
                  <span className="text-white text-sm flex-1">{child.displayName}</span>
                  <span className="text-zinc-500 text-xs">{child.email.includes("@sinregistro.local") ? "Sin correo" : child.email}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${child.membershipStatus === "activo" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                    {child.membershipStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Agregar hijos nuevos (only when creating or explicitly for edit) ── */}
        <div className="border-t border-zinc-800 pt-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-zinc-400 uppercase tracking-wider">Agregar hijos</label>
            <button type="button" onClick={addPendingChild}
              className="text-gold hover:text-gold-dark text-xs border border-gold/30 hover:border-gold px-2 py-0.5 rounded transition">
              + Agregar hijo
            </button>
          </div>
          {pendingChildren.length === 0 && (
            <p className="text-zinc-600 text-xs">Los hijos se crean con su acudiente como responsable.</p>
          )}
          <div className="space-y-2">
            {pendingChildren.map((child) => (
              <div key={child.key} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Hijo</span>
                  <button type="button" onClick={() => removePendingChild(child.key)}
                    className="text-zinc-500 hover:text-red-400 text-xs">✕ Quitar</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <input
                      value={child.name}
                      onChange={(e) => updatePendingChild(child.key, "name", e.target.value)}
                      placeholder="Nombre *"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-gold"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="email"
                      value={child.email}
                      onChange={(e) => updatePendingChild(child.key, "email", e.target.value)}
                      placeholder="Email (opcional)"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-gold"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      value={child.phone}
                      onChange={(e) => updatePendingChild(child.key, "phone", e.target.value)}
                      placeholder="Teléfono (opcional)"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-gold"
                    />
                  </div>
                </div>
                <p className="text-zinc-600 text-[10px] mt-1.5">Si no tiene email, se generará uno interno automáticamente.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-zinc-400 py-2 rounded hover:bg-zinc-700 transition">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-gold text-black font-bold py-2 rounded hover:bg-gold-dark disabled:opacity-50 transition">
            {saving ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function getUserExpiryStatus(user: AdminUser): { label: string; color: string; sortKey: number } {
  if (!user.membershipExpiresAt) return { label: "Sin registro", color: "text-zinc-500", sortKey: 3 };
  const exp = new Date(user.membershipExpiresAt);
  const diff = exp.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `Venció hace ${Math.abs(days)}d`, color: "text-red-400", sortKey: 0 };
  if (days <= 7) return { label: `Vence en ${days}d`, color: "text-amber-400", sortKey: 1 };
  return { label: `${days}d restantes`, color: "text-green-400", sortKey: 2 };
}

type StatusFilter = "todos" | "vencidos" | "por_vencer" | "activos";

// ─── Action Menu (3 dots) ─────────────────────────────────────

function ActionMenu({ onAdd, onEdit, onDelete, onEditUser, onAddChild, latestPayment, phone }: {
  onAdd: () => void;
  onEdit: (p: Payment) => void;
  onDelete: (p: Payment) => void;
  onEditUser: () => void;
  onAddChild: () => void;
  latestPayment: Payment | null;
  phone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-700 transition text-lg leading-none"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-40 min-w-[180px]">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEditUser(); }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <span className="text-zinc-400">✎</span> Editar usuario
          </button>
          {phone && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); window.open(`https://wa.me/${phone.replace(/\D/g, "").replace(/^0+/, "57")}`, "_blank"); }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 transition flex items-center gap-2"
            >
              <span className="text-green-400">💬</span> WhatsApp
            </button>
          )}
          <div className="border-t border-zinc-700 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onAdd(); }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <span className="text-gold">+</span> Agregar pago
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onAddChild(); }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <span className="text-blue-400">👦</span> Agregar hijo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── User Row (expandable) ────────────────────────────────────

function UserRow({ user, payments, allUsers, dateFrom, dateTo, onAddPayment, onEditPayment, onDeletePayment, onEditUser, onAddChild }: {
  user: AdminUser;
  payments: Payment[];
  allUsers: AdminUser[];
  dateFrom: string;
  dateTo: string;
  onAddPayment: (userId: number) => void;
  onEditPayment: (p: Payment) => void;
  onDeletePayment: (p: Payment) => void;
  onEditUser: (user: AdminUser) => void;
  onAddChild: (parentId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getUserExpiryStatus(user);
  const latestPayment = payments.length > 0 ? payments[0] : null;

  const parent = user.parentId ? allUsers.find((u) => u.id === user.parentId) : null;
  const children = allUsers.filter((u) => u.parentId === user.id);

  // Filter payments by date range
  const filteredPayments = useMemo(() => {
    let list = payments;
    if (dateFrom) list = list.filter((p) => p.paymentDate >= dateFrom);
    if (dateTo) list = list.filter((p) => p.paymentDate <= dateTo);
    return list;
  }, [payments, dateFrom, dateTo]);

  return (
    <div className="border-b border-zinc-800/50">
      {/* Main user row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center px-4 py-3 hover:bg-zinc-800/30 cursor-pointer transition select-none"
      >
        {/* Expand arrow */}
        <span className={`text-zinc-500 mr-3 transition-transform text-xs ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{user.displayName}</span>
            {user.nickname && <span className="text-gold text-xs">({user.nickname})</span>}
            {children.length > 0 && (
              <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                👨‍👧 {children.length} {children.length === 1 ? "hijo" : "hijos"}
              </span>
            )}
          </div>
          <div className="text-zinc-500 text-xs truncate">
            {user.email.includes("@sinregistro.local") ? (
              <span className="text-zinc-600 italic">Sin correo registrado</span>
            ) : user.email}
          </div>
          {parent && (
            <div className="text-zinc-600 text-[10px] truncate">
              👤 Acudiente: <span className="text-zinc-500">{parent.displayName}</span>
            </div>
          )}
        </div>

        {/* Subscription level badge */}
        <div className="w-32 flex justify-center mr-2 shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
            user.subscriptionLevel === "personalizado" ? "bg-purple-900/30 text-purple-400 border border-purple-800" :
            user.subscriptionLevel === "avanzado" ? "bg-blue-900/30 text-blue-400 border border-blue-800" :
            user.subscriptionLevel === "medio" ? "bg-cyan-900/30 text-cyan-400 border border-cyan-800" :
            "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}>
            {SUBSCRIPTION_LABELS[user.subscriptionLevel ?? "basico"] ?? user.subscriptionLevel}
          </span>
        </div>

        {/* Status badge */}
        <div className="w-20 flex justify-center mr-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            user.membershipStatus === "activo" ? "bg-green-900/30 text-green-400 border border-green-800" :
            user.membershipStatus === "pausado" ? "bg-amber-900/30 text-amber-400 border border-amber-800" :
            "bg-red-900/30 text-red-400 border border-red-800"
          }`}>
            {user.membershipStatus}
          </span>
        </div>

        {/* Expiry info */}
        <div className="w-44 text-right mr-4">
          {user.membershipExpiresAt ? (
            <div>
              <span className="text-zinc-400 text-xs">{fmtDate(user.membershipExpiresAt.slice(0, 10))}</span>
              <span className={`ml-2 text-xs ${status.color}`}>{status.label}</span>
            </div>
          ) : (
            <span className="text-zinc-600 text-xs">Sin pagos</span>
          )}
        </div>

        {/* Last payment amount */}
        <div className="w-28 text-right mr-4">
          {latestPayment ? (
            <span className="text-gold font-medium text-sm">{fmtMoney(latestPayment.amount)}</span>
          ) : (
            <span className="text-zinc-600 text-sm">—</span>
          )}
        </div>

        {/* Total value */}
        <div className="w-28 text-right mr-4">
          <span className="text-white font-medium text-sm">
            {payments.length > 0
              ? fmtMoney(payments.reduce((sum, p) => sum + (p.amount ?? 0), 0))
              : "—"}
          </span>
        </div>

        {/* Payment count */}
        <div className="w-16 text-center mr-2">
          <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded">
            {payments.length} pago{payments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Action menu */}
        <ActionMenu
          onAdd={() => onAddPayment(user.id)}
          onEdit={onEditPayment}
          onDelete={onDeletePayment}
          onEditUser={() => onEditUser(user)}
          onAddChild={() => onAddChild(user.id)}
          latestPayment={latestPayment}
          phone={user.phone}
        />
      </div>

      {/* Expanded payment history */}
      {expanded && (
        <div className="bg-zinc-950/50 border-t border-zinc-800/50">
          {/* Children summary */}
          {children.length > 0 && (
            <div className="px-12 py-3 border-b border-zinc-800/50">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Hijos</div>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => {
                  const childStatus = getUserExpiryStatus(child);
                  return (
                    <div key={child.id} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                      <div className="mr-1">
                        <span className="text-white text-xs font-medium">{child.displayName}</span>
                        {child.email.includes("@sinregistro.local") ? (
                          <span className="block text-zinc-600 text-[10px] italic">Sin correo</span>
                        ) : (
                          <span className="block text-zinc-500 text-[10px]">{child.email}</span>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        child.membershipStatus === "activo" ? "bg-green-900/30 text-green-400" :
                        child.membershipStatus === "pausado" ? "bg-amber-900/30 text-amber-400" :
                        "bg-red-900/30 text-red-400"
                      }`}>{child.membershipStatus}</span>
                      <span className={`text-[10px] ${childStatus.color}`}>{childStatus.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddPayment(child.id); }}
                        className="ml-1 text-[10px] px-2 py-0.5 rounded border border-gold/40 text-gold hover:bg-gold/10 transition"
                      >
                        + Pago
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredPayments.length === 0 ? (
            <div className="px-12 py-4 text-zinc-600 text-sm flex items-center justify-between">
              <span>No hay pagos registrados</span>
              <button
                onClick={() => onAddPayment(user.id)}
                className="text-gold hover:text-gold-dark text-xs px-3 py-1 rounded border border-gold/30 hover:border-gold transition"
              >
                + Agregar primer pago
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="pl-12 pr-4 py-2 text-left">Fecha Pago</th>
                  <th className="px-4 py-2 text-left">Vencimiento</th>
                  <th className="px-4 py-2 text-left">Paquete</th>
                  <th className="px-4 py-2 text-left">Método</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-left">Notas</th>
                  <th className="px-4 py-2 text-right pr-6"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => {
                  const expDate = p.expiresDate;
                  const exp = new Date(expDate + "T23:59:59");
                  const diff = exp.getTime() - Date.now();
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  const expColor = days < 0 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-green-400";
                  const expLabel = days < 0 ? `Venció hace ${Math.abs(days)}d` : days <= 7 ? `Vence en ${days}d` : `${days}d`;

                  return (
                    <tr key={p.id} className={`border-t border-zinc-800/30 hover:bg-zinc-800/20 transition ${i === 0 ? "bg-zinc-900/30" : ""}`}>
                      <td className="pl-12 pr-4 py-2 text-sm text-white">
                        {fmtDate(p.paymentDate)}
                        {i === 0 && <span className="ml-2 text-[10px] text-gold uppercase">último</span>}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="text-zinc-300">{fmtDate(expDate)}</span>
                        <span className={`ml-2 text-xs ${expColor}`}>{expLabel}</span>
                      </td>
                      <td className="px-4 py-2">
                        {p.subscriptionLevel ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            p.subscriptionLevel === "personalizado" ? "bg-purple-900/30 text-purple-400 border border-purple-800" :
                            p.subscriptionLevel === "avanzado" ? "bg-blue-900/30 text-blue-400 border border-blue-800" :
                            p.subscriptionLevel === "medio" ? "bg-cyan-900/30 text-cyan-400 border border-cyan-800" :
                            "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {SUBSCRIPTION_LABELS[p.subscriptionLevel] ?? p.subscriptionLevel}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs text-zinc-300">
                          {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        <span className="text-gold font-medium">{fmtMoney(p.amount)}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-500 max-w-[200px] truncate">
                        {p.notes ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => onEditPayment(p)}
                            className="text-zinc-500 hover:text-gold text-xs px-2 py-1 rounded hover:bg-zinc-800 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDeletePayment(p)}
                            className="text-zinc-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-zinc-800 transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────

function PaymentsPanel({ onLogout }: { onLogout: () => void }) {
  const [userPayments, setUserPayments] = useState<Record<number, Payment[]>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modal, setModal] = useState<{ payment: Payment | null; preselectedUserId?: number } | null>(null);
  const [userModal, setUserModal] = useState<{ user: AdminUser | null; prefilledParentId?: number } | null>(null);
  const [ingresosPeriod, setIngresosPeriod] = useState<"mes" | "trimestre" | "semestre" | "año" | "global">("mes");
  const [sortBy, setSortBy] = useState<"reciente" | "nombre_asc" | "nombre_desc" | "total_desc" | "total_asc">("reciente");

  const load = useCallback(async () => {
    try {
      const uRes = await adminApi.getUsers();
      setUsers(uRes.users);
      // Fetch payments for all users in parallel (batched)
      const paymentsMap: Record<number, Payment[]> = {};
      const batchSize = 10;
      for (let i = 0; i < uRes.users.length; i += batchSize) {
        const batch = uRes.users.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((u) =>
            adminApi.getUserPayments(u.id).then((r) => ({
              userId: u.id,
              payments: r.payments.map((p) => ({
                ...p,
                userName: u.displayName,
                userNickname: u.nickname,
              })),
            })).catch(() => ({ userId: u.id, payments: [] as Payment[] }))
          )
        );
        for (const r of results) {
          // Sort by paymentDate desc
          r.payments.sort((a, b) => (b.paymentDate > a.paymentDate ? 1 : -1));
          paymentsMap[r.userId] = r.payments;
        }
      }
      setUserPayments(paymentsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Filter & sort users
  const filteredUsers = useMemo(() => {
    let list = users;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          (u.nickname ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "todos") {
      list = list.filter((u) => {
        const s = getUserExpiryStatus(u);
        if (statusFilter === "vencidos") return s.sortKey === 0;
        if (statusFilter === "por_vencer") return s.sortKey === 1;
        if (statusFilter === "activos") return s.sortKey === 2;
        return true;
      });
    }

    // Date filter: only show users who have payments in the date range
    if (dateFrom || dateTo) {
      list = list.filter((u) => {
        const ups = userPayments[u.id] ?? [];
        return ups.some((p) => {
          if (dateFrom && p.paymentDate < dateFrom) return false;
          if (dateTo && p.paymentDate > dateTo) return false;
          return true;
        });
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === "nombre_asc") return a.displayName.localeCompare(b.displayName, "es");
      if (sortBy === "nombre_desc") return b.displayName.localeCompare(a.displayName, "es");
      if (sortBy === "total_desc" || sortBy === "total_asc") {
        const aTotal = (userPayments[a.id] ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
        const bTotal = (userPayments[b.id] ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
        return sortBy === "total_desc" ? bTotal - aTotal : aTotal - bTotal;
      }
      // Default: most recent payment first
      const aPayments = userPayments[a.id] ?? [];
      const bPayments = userPayments[b.id] ?? [];
      const aLatest = aPayments.length > 0 ? aPayments[0].paymentDate : "";
      const bLatest = bPayments.length > 0 ? bPayments[0].paymentDate : "";
      if (!aLatest && !bLatest) return 0;
      if (!aLatest) return 1;
      if (!bLatest) return -1;
      return bLatest > aLatest ? 1 : bLatest < aLatest ? -1 : 0;
    });

    return list;
  }, [users, searchQuery, statusFilter, dateFrom, dateTo, userPayments, sortBy]);

  // Stats
  const allPayments = Object.values(userPayments).flat();
  const totalActive = users.filter((u) => u.membershipStatus === "activo").length;
  const vencidos = users.filter((u) => getUserExpiryStatus(u).sortKey === 0).length;
  const porVencer = users.filter((u) => getUserExpiryStatus(u).sortKey === 1).length;

  const ingresosTotal = useMemo(() => {
    const now = new Date();
    let desde: Date;
    if (ingresosPeriod === "global") {
      desde = new Date(0);
    } else {
      desde = new Date(now);
      if (ingresosPeriod === "mes") desde.setMonth(desde.getMonth() - 1);
      else if (ingresosPeriod === "trimestre") desde.setMonth(desde.getMonth() - 3);
      else if (ingresosPeriod === "semestre") desde.setMonth(desde.getMonth() - 6);
      else if (ingresosPeriod === "año") desde.setFullYear(desde.getFullYear() - 1);
    }
    const desdeStr = desde.toISOString().slice(0, 10);
    return allPayments
      .filter((p) => p.paymentDate >= desdeStr)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [allPayments, ingresosPeriod]);

  const periodLabels: Record<string, string> = {
    mes: "Ingresos del mes",
    trimestre: "Ingresos trimestre",
    semestre: "Ingresos semestre",
    año: "Ingresos del año",
    global: "Ingresos totales",
  };
  const periodOrder: Array<"mes" | "trimestre" | "semestre" | "año" | "global"> = ["mes", "trimestre", "semestre", "año", "global"];
  const cycleIngresosPeriod = () => {
    const idx = periodOrder.indexOf(ingresosPeriod);
    setIngresosPeriod(periodOrder[(idx + 1) % periodOrder.length]);
  };

  const handleSave = async (
    data: { userId: number; paymentDate: string; expiresDate: string; amount?: number; paymentMethod: string; subscriptionLevel?: string; notes?: string },
    id?: number
  ) => {
    if (id) {
      await adminApi.updatePayment(id, data);
    } else {
      await adminApi.createPayment(data.userId, data);
    }
    await load();
  };

  const handleDelete = async (p: Payment) => {
    if (!window.confirm(`¿Eliminar pago de ${p.userName ?? "usuario"} del ${fmtDate(p.paymentDate)}?`)) return;
    try {
      await adminApi.deletePayment(p.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-gold text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gold font-bold text-lg">忍</span>
          <span className="text-white font-semibold">Shinobi Iga Ryu</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 text-sm">Gestión de Pagos</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-zinc-500 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800 transition">
            ↻ Refrescar
          </button>
          <button onClick={onLogout} className="text-zinc-500 hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-zinc-800 transition">
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 flex gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === "activos" ? "todos" : "activos")}
          className={`bg-zinc-900 border rounded-lg px-4 py-3 flex-1 text-left transition hover:border-green-800 ${statusFilter === "activos" ? "border-green-600" : "border-zinc-800"}`}
        >
          <div className="text-2xl font-bold text-green-400">{totalActive}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Activos</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "por_vencer" ? "todos" : "por_vencer")}
          className={`bg-zinc-900 border rounded-lg px-4 py-3 flex-1 text-left transition hover:border-amber-800 ${statusFilter === "por_vencer" ? "border-amber-600" : "border-zinc-800"}`}
        >
          <div className="text-2xl font-bold text-amber-400">{porVencer}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Por vencer (7d)</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "vencidos" ? "todos" : "vencidos")}
          className={`bg-zinc-900 border rounded-lg px-4 py-3 flex-1 text-left transition hover:border-red-800 ${statusFilter === "vencidos" ? "border-red-600" : "border-zinc-800"}`}
        >
          <div className="text-2xl font-bold text-red-400">{vencidos}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Vencidos</div>
        </button>
        <button
          onClick={cycleIngresosPeriod}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex-1 text-left transition hover:border-gold/50"
        >
          <div className="text-2xl font-bold text-gold">{fmtMoney(ingresosTotal)}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">{periodLabels[ingresosPeriod]}</div>
        </button>
      </div>

      {/* Filters bar */}
      <div className="px-6 pb-3 flex items-center gap-3 flex-wrap">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, apodo o email..."
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-white text-sm outline-none focus:border-gold w-64"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-xs">Desde</span>
          <input
            type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-xs">Hasta</span>
          <input
            type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-gold"
          />
        </div>
        {(statusFilter !== "todos" || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatusFilter("todos"); setDateFrom(""); setDateTo(""); }}
            className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded hover:bg-zinc-800 flex items-center gap-1"
          >
            ✕ Limpiar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-zinc-500 text-xs">{filteredUsers.length} usuario(s)</span>
          <button
            onClick={() => setUserModal({ user: null })}
            className="bg-gold text-black font-bold px-4 py-1.5 rounded hover:bg-gold-dark transition text-sm"
          >
            + Nuevo Usuario
          </button>
        </div>
      </div>

      {/* User list with expandable payments */}
      <div className="px-6 pb-6 flex-1 overflow-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-4 py-2.5 border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider select-none">
            <span className="w-6 mr-3"></span>
            <button
              onClick={() => setSortBy(sortBy === "nombre_asc" ? "nombre_desc" : sortBy === "nombre_desc" ? "reciente" : "nombre_asc")}
              className={`flex-1 text-left hover:text-white transition cursor-pointer ${sortBy.startsWith("nombre") ? "text-gold" : ""}`}
            >
              Usuario {sortBy === "nombre_asc" ? "↑" : sortBy === "nombre_desc" ? "↓" : ""}
            </button>
            <span className="w-32 text-center mr-2">Plan</span>
            <span className="w-20 text-center mr-4">Estado</span>
            <span className="w-44 text-right mr-4">Vencimiento</span>
            <span className="w-28 text-right mr-4">Último monto</span>
            <button
              onClick={() => setSortBy(sortBy === "total_desc" ? "total_asc" : sortBy === "total_asc" ? "reciente" : "total_desc")}
              className={`w-28 text-right mr-4 hover:text-white transition cursor-pointer ${sortBy.startsWith("total") ? "text-gold" : ""}`}
            >
              Total pagado {sortBy === "total_desc" ? "↓" : sortBy === "total_asc" ? "↑" : ""}
            </button>
            <span className="w-16 text-center mr-2">Pagos</span>
            <span className="w-8"></span>
          </div>

          {/* Rows */}
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-600">
              No se encontraron usuarios
            </div>
          ) : (
            filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                payments={userPayments[user.id] ?? []}
                allUsers={users}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onAddPayment={(userId) => setModal({ payment: null, preselectedUserId: userId })}
                onEditPayment={(p) => setModal({ payment: p })}
                onDeletePayment={handleDelete}
                onEditUser={(u) => setUserModal({ user: u })}
                onAddChild={(parentId) => setUserModal({ user: null, prefilledParentId: parentId })}
              />
            ))
          )}
        </div>
      </div>

      {modal && (
        <PaymentModal
          payment={modal.payment}
          users={users}
          preselectedUserId={modal.preselectedUserId}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {userModal && (
        <UserModal
          user={userModal.user}
          users={users}
          prefilledParentId={userModal.prefilledParentId}
          onSave={load}
          onClose={() => setUserModal(null)}
        />
      )}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    authApi.me()
      .then(({ user }) => {
        setAuthed(user.roles.includes("admin"));
      })
      .catch(() => setAuthed(false));
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-gold text-lg">Cargando...</div>
      </div>
    );
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <PaymentsPanel onLogout={handleLogout} />;
}
