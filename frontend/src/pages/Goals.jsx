import { useState, useEffect, useCallback } from 'react'
import { getGoals, getDebts, createGoal, updateGoal, deleteGoal } from '../utils/api'
import { fmt } from '../utils/format'
import { Plus, Trash2, Edit2, X, Target, CheckCircle, Trophy, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ICONS = ['🎯','🏆','🛡️','📉','💪','🚀','💰','🏠','🚗','🎓','✈️','💎']

// Real-time clock
function RealTimeClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-xs text-gray-500">
      {now.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'})}
      {' '}{now.toLocaleTimeString('th-TH')}
    </span>
  )
}

function GoalModal({ goal, debts, onClose, onSaved }) {
  const { userId } = useAuth()
  const isEdit = !!goal?.id
  const [form, setForm] = useState({
    title:          goal?.title          || '',
    target_amount:  goal?.target_amount  ?? '',
    current_amount: goal?.current_amount ?? '',
    target_date:    goal?.target_date    || '',
    debt_id:        goal?.debt_id        || '',
    icon:           goal?.icon           || '🎯',
    status:         goal?.status         || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Validate current_amount ≤ target_amount
  const handleCurrentAmount = (v) => {
    const cur = parseFloat(v)
    const tgt = parseFloat(form.target_amount)
    if (!isNaN(cur) && !isNaN(tgt) && cur > tgt) {
      setErr(`ความคืบหน้าต้องไม่เกินเป้าหมาย (${fmt(tgt)})`)
    } else {
      setErr('')
    }
    set('current_amount', v)
  }

  // ── Auto-complete: ถ้า current >= target ให้ status = achieved
  const resolvedStatus = () => {
    const cur = parseFloat(form.current_amount) || 0
    const tgt = parseFloat(form.target_amount)  || 0
    return tgt > 0 && cur >= tgt ? 'achieved' : 'active'
  }

  const handleSubmit = async () => {
    if (!form.title || !form.target_amount) { setErr('กรุณากรอกชื่อและเป้าหมาย'); return }
    const cur = parseFloat(form.current_amount) || 0
    const tgt = parseFloat(form.target_amount)
    if (cur > tgt) { setErr(`ความคืบหน้าต้องไม่เกินเป้าหมาย (${fmt(tgt)})`); return }

    setSaving(true); setErr('')
    try {
      const data = {
        ...form,
        userId,
        target_amount:  tgt,
        current_amount: cur,
        debt_id:        form.debt_id || null,
        status:         resolvedStatus(),
      }
      if (isEdit) await updateGoal(goal.id, data)
      else        await createGoal(data)
      onSaved(); onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'เกิดข้อผิดพลาด')
    } finally { setSaving(false) }
  }

  const tgt = parseFloat(form.target_amount) || 0
  const cur = parseFloat(form.current_amount) || 0
  const pct = tgt > 0 ? Math.min(100, Math.round(cur/tgt*100)) : 0
  const willComplete = tgt > 0 && cur >= tgt

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end lg:items-center justify-center p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">{isEdit ? '✏️ แก้ไขเป้าหมาย' : '+ เพิ่มเป้าหมาย'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-700 rounded-lg"><X size={18}/></button>
        </div>

        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            ⚠️ {err}
          </div>
        )}

        {/* Preview progress bar */}
        {tgt > 0 && (
          <div className="p-3 bg-surface-700 rounded-xl">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>ความคืบหน้า</span>
              <span className={willComplete ? 'text-green-400 font-semibold' : ''}>{pct}%</span>
            </div>
            <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                willComplete ? 'bg-green-400' : 'bg-gradient-to-r from-brand-500 to-orange-400'}`}
                style={{ width: `${pct}%` }}/>
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-gray-500">{fmt(cur)}</span>
              <span className="text-gray-500">{fmt(tgt)}</span>
            </div>
            {willComplete && (
              <p className="text-xs text-green-400 font-semibold mt-2 flex items-center gap-1.5">
                <CheckCircle size={13}/> เมื่อบันทึกแล้วจะถูกทำเครื่องหมายว่า "สำเร็จ" ✅
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* ไอคอน */}
          <div>
            <label className="label">ไอคอน</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => set('icon', ic)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                    form.icon===ic ? 'bg-brand-500 scale-110' : 'bg-surface-700 hover:bg-surface-600'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* ชื่อเป้าหมาย */}
          <div>
            <label className="label">ชื่อเป้าหมาย *</label>
            <input className="input" placeholder="เช่น ปิดบัตรเครดิต KBank"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* เป้าหมาย + ความคืบหน้า */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">เป้าหมาย (฿) *</label>
              <input className="input" type="number" placeholder="50000"
                value={form.target_amount}
                onChange={e => {
                  set('target_amount', e.target.value)
                  // re-validate current
                  const cur2 = parseFloat(form.current_amount)||0
                  const tgt2 = parseFloat(e.target.value)||0
                  setErr(cur2 > tgt2 && tgt2 > 0 ? `ความคืบหน้าต้องไม่เกินเป้าหมาย (${fmt(tgt2)})` : '')
                }}/>
            </div>
            <div>
              <label className="label">ความคืบหน้า (฿)</label>
              <input className="input" type="number" placeholder="0"
                value={form.current_amount}
                onChange={e => handleCurrentAmount(e.target.value)}/>
              {tgt > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  สูงสุด {fmt(tgt)}
                </p>
              )}
            </div>
          </div>

          {/* วันที่เป้าหมาย + ผูกหนี้ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เป้าหมาย</label>
              <input className="input" type="date"
                value={form.target_date||''} onChange={e => set('target_date', e.target.value)} />
            </div>
            <div>
              <label className="label">ผูกกับหนี้</label>
              <select className="input" value={form.debt_id||''} onChange={e => set('debt_id', e.target.value)}>
                <option value="">ไม่ผูก</option>
                {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">ยกเลิก</button>
          <button onClick={handleSubmit} disabled={saving || !!err}
            className="btn-primary flex-1">
            {saving ? 'กำลังบันทึก...' : isEdit ? '✏️ บันทึก' : '+ เพิ่ม'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Goal Card ────────────────────────────────────────────────
function GoalCard({ g, onEdit, onDelete, onMarkAchieved }) {
  const pct      = g.target_amount > 0
    ? Math.min(100, Math.round(g.current_amount / g.target_amount * 100))
    : 0
  const daysLeft = g.target_date
    ? Math.ceil((new Date(g.target_date) - new Date()) / 86400000)
    : null
  const isAchieved = g.status === 'achieved'

  return (
    <div className={`card-hover ${isAchieved ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{g.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-semibold ${isAchieved ? 'line-through text-gray-400' : ''}`}>{g.title}</p>
              {g.debt_name && <p className="text-xs text-gray-500">ผูกกับ: {g.debt_name}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!isAchieved && (
                <button onClick={() => onEdit(g)}
                  className="p-1.5 hover:bg-surface-700 rounded-lg text-gray-500 hover:text-brand-400">
                  <Edit2 size={13}/>
                </button>
              )}
              <button onClick={() => onDelete(g.id)}
                className="p-1.5 hover:bg-surface-700 rounded-lg text-gray-500 hover:text-red-400">
                <Trash2 size={13}/>
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2 h-2 bg-surface-600 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              isAchieved || pct>=100
                ? 'bg-green-400'
                : 'bg-gradient-to-r from-brand-500 to-orange-400'}`}
              style={{ width: `${pct}%` }}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {fmt(g.current_amount)} / {fmt(g.target_amount)}
              <span className={`ml-1 font-medium ${isAchieved || pct>=100 ? 'text-green-400' : 'text-gray-300'}`}>
                ({pct}%)
              </span>
            </span>
            {daysLeft !== null && !isAchieved && (
              <span className={`text-xs flex items-center gap-1 ${
                daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-yellow-400' : 'text-gray-500'}`}>
                <Clock size={10}/>
                {daysLeft < 0 ? `เกินกำหนด ${Math.abs(daysLeft)} วัน`
                  : daysLeft === 0 ? 'ถึงกำหนดวันนี้'
                  : `เหลือ ${daysLeft} วัน`}
              </span>
            )}
          </div>

          {/* Achieved badge */}
          {isAchieved && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <Trophy size={13}/> สำเร็จแล้ว! 🎉
            </div>
          )}

          {/* ยังไม่สำเร็จแต่ครบแล้ว — ปุ่ม mark */}
          {!isAchieved && pct >= 100 && (
            <button onClick={() => onMarkAchieved(g)}
              className="mt-2 text-xs text-green-400 hover:text-green-300 font-semibold flex items-center gap-1.5 transition-colors">
              <CheckCircle size={13}/> กดเพื่อทำเครื่องหมายว่าสำเร็จ ✅
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function Goals() {
  const { userId } = useAuth()
  const [goals,     setGoals]     = useState([])
  const [debts,     setDebts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGoal,  setEditGoal]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [gr, dr] = await Promise.all([getGoals(userId), getDebts(userId)])
      setGoals(gr.data.data || [])
      setDebts(dr.data.data || [])
    } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  // Auto-check: ถ้า current_amount >= target_amount → achieved
  useEffect(() => {
    goals.forEach(async g => {
      if (g.status === 'active' && g.current_amount >= g.target_amount && g.target_amount > 0) {
        try {
          await updateGoal(g.id, { status: 'achieved' })
          setGoals(prev => prev.map(x => x.id===g.id ? {...x, status:'achieved'} : x))
        } catch {}
      }
    })
  }, [goals])

  const handleDelete = async (id) => {
    if (!confirm('ลบเป้าหมายนี้?')) return
    await deleteGoal(id)
    setGoals(g => g.filter(x => x.id !== id))
  }

  const handleMarkAchieved = async (g) => {
    await updateGoal(g.id, { status: 'achieved' })
    setGoals(prev => prev.map(x => x.id===g.id ? {...x, status:'achieved'} : x))
  }

  const openAdd  = () => { setEditGoal(null); setShowModal(true) }
  const openEdit = (g) => { setEditGoal(g);   setShowModal(true) }

  const active   = goals.filter(g => g.status === 'active')
  const achieved = goals.filter(g => g.status === 'achieved')
  const totalTarget  = active.reduce((s,g) => s + g.target_amount,  0)
  const totalCurrent = active.reduce((s,g) => s + g.current_amount, 0)
  const overallPct   = totalTarget > 0 ? Math.min(100, Math.round(totalCurrent/totalTarget*100)) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between animate-in">
        <div>
          <h1 className="font-display font-bold text-2xl">เป้าหมาย</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {active.length} กำลังดำเนินการ · {achieved.length} สำเร็จแล้ว
          </p>
          <div className="mt-1"><RealTimeClock/></div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16}/> เพิ่ม
        </button>
      </div>

      {/* Overall progress */}
      {active.length > 0 && (
        <div className="card animate-in delay-100">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-sm text-gray-400">ภาพรวมเป้าหมายที่กำลังดำเนินการ</p>
            <p className="font-bold text-white">{overallPct}%</p>
          </div>
          <div className="h-3 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-orange-400 rounded-full transition-all duration-1000"
              style={{ width: `${overallPct}%` }}/>
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-500">
            <span>{fmt(totalCurrent)}</span>
            <span>{fmt(totalTarget)}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target size={40} className="text-gray-600 mx-auto mb-3"/>
          <p className="text-gray-400">ยังไม่มีเป้าหมาย — ตั้งเป้าหมายแรกได้เลย!</p>
          <button onClick={openAdd} className="btn-primary mt-4 text-sm">+ ตั้งเป้าหมาย</button>
        </div>
      ) : (
        <div className="space-y-3 animate-in delay-100">
          {/* Active goals */}
          {active.map(g => (
            <GoalCard key={g.id} g={g}
              onEdit={openEdit}
              onDelete={handleDelete}
              onMarkAchieved={handleMarkAchieved}/>
          ))}

          {/* Achieved goals */}
          {achieved.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-5 mb-2">
                <Trophy size={15} className="text-yellow-400"/>
                <p className="text-sm text-yellow-400 font-semibold">สำเร็จแล้ว ({achieved.length})</p>
              </div>
              {achieved.map(g => (
                <GoalCard key={g.id} g={g}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onMarkAchieved={handleMarkAchieved}/>
              ))}
            </>
          )}
        </div>
      )}

      {showModal && (
        <GoalModal
          goal={editGoal}
          debts={debts}
          onClose={() => { setShowModal(false); setEditGoal(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
