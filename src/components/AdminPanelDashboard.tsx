import React, { useState } from 'react';

interface FamilyRow {
  name: string;
  avatarLetter: string;
  created: string;
  membersAvatars: string[];
  extraCount?: number;
  progress: number;
  color: string;
}

export default function AdminPanelDashboard() {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const summaryCards = [
    { title: 'Total de Familias', value: '1,248', trend: '+12%', icon: 'group', color: 'text-brand-dark bg-brand-light' },
    { title: 'Usuarios Activos (Mensuales)', value: '4,892', trend: '+5%', icon: 'person', color: 'text-rose-700 bg-rose-50' },
    { title: 'Tareas Completadas Hoy', value: '12.5k', progress: 75, icon: 'task_alt', color: 'text-purple-700 bg-purple-50' }
  ];

  const familiesList: FamilyRow[] = [
    {
      name: 'Familia Martínez',
      avatarLetter: 'M',
      created: 'Creado hace 2 días',
      membersAvatars: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBZdNJ6YhlV8vxKXDcp-zth5G94OOxZPwiUYy_rbaw0x8D2uoOcJ1pY_rs-6GO1Dzm4ZrBiZ5019ssn8Rj9Q4P39PSVUw-NXM1YrQUrtIV5WbuLOViC37m7E4VFpBoeDgLVIDtmhRfpeCr3eHjR_mXI4qPb1nSA9uM0prYXiNg0mRfRhWyCEUf0BMTnpew63-dIW0T2GutM6ci5aETeL_ELXHLjY_Wk33e6sfEVpPGVMPe4ErFFFRpD0qN_avcYm01n23hy6TV456k',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD_ULNF0HZ2QgJZ-Y0PAoTxRfF2-WS1oWudJHKgTxOuslfDHzSBrhd_13_l89hAK2P8Ex4rdfJDQzqqcMCIALzMKTd03vMOSaMr2DA0s3CXFoJKq4q_lQ44Wt4POLPW6NaKwlQQLhCk53_--6DRCu4i7w15AknPi3TlF6IL6l2fdE24EwSWoLonVhXzDHzO2NIe2kt5o-prvLGy3u03L_4qi5tMwHYJziODhZI-77MfcW2gj1jUvO7XF2zyx2XGXd8o2o0tN4oDAqo',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuTrtRFoIhuwZt1Fs84qxldHfJX0WmrdE2tOxYQyTEWgnbwWPuB5E--jmYr2N_Ko728hQ1lnXb7_wUMWaBonL-1bj4dq_wPe6dlqSJqNI3ObYyFd2pg6rFNiDNV80mdhNUnwMQGSZ4ka3hL-mApvP55pdnUjDoXKuIMQDJbp1dhykEBT0WARNCcB0KHcrwKg2VOFn-pekiQH7oDaCdc7xnkRimoOv3io-VBZiYBVCgdRyMCTn_4yhHC3T3k7bMUv1178H0233tf2nM'
      ],
      extraCount: 1,
      progress: 85,
      color: 'bg-emerald-500'
    },
    {
      name: 'Hogar Chen',
      avatarLetter: 'C',
      created: 'Creado hace 5 días',
      membersAvatars: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDYGNMXjo0YOH7N-rhu2udzKloBGQT_cCTujqSpYMrfLsmi0xPnKIWrkU8UrF1zUDlL5t6G2bUq47TacPzFzP-d8LfLM9qb8YIr-oUWkqDVBoc1QAws83cnCij1Mss6EfoNhu0NMWZ94mkFJDVyYL53kYZ4idO9NUOvGVxH6GqGfr2iB9xRQPiE61oZFf0wsLbSd4rvIZHG0Xjp0uNNfH_DL7pMOarTNWEuPMpqQivr58F_yPEYMXJDClzRwGMboTfKtzLin17r5h8',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCJUclD9T5awIyn-Nl0YfKEBDpr6zrPdbldDXu2mY74xL8MkzW9BH1pMZlOJarDkEn852W3CYg2I6PbAi-ZAC5nixrWaH4NjKil83WXBSMsrUm_DYt1iHWFmn5oqiWpYu9xwGw7WXg6Pugsep-MRWmgIkvJBn6v302cMoYDlPn_hGMRgTNf1hCickRmfMT--9UhwpYWPv0qx_wpUhKDhxMXO1ZGnMpZokQXJ-XBW91dml77jJUJVJaY2KYgnS99bI61umKmhxCcyDY'
      ],
      progress: 42,
      color: 'bg-rose-500'
    },
    {
      name: 'Familia Smith-Jones',
      avatarLetter: 'S',
      created: 'Creado hace 1 semana',
      membersAvatars: [],
      extraCount: 5,
      progress: 92,
      color: 'bg-brand-primary'
    }
  ];

  const filteredFamilies = familiesList.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-sans text-xl md:text-2xl font-extrabold">Vista General</h2>
          <p className="font-sans text-xs text-indigo-100 mt-1">Visión unificada y analíticas de la red Núcleo Familiar.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-white hover:opacity-80 flex items-center gap-1.5 bg-white/10 px-4 py-2 rounded-full text-xs font-bold">
            <span className="material-symbols-outlined text-sm font-bold">warning</span>
            Alertas
          </button>
          <button className="text-white hover:opacity-80 flex items-center gap-1.5 bg-white/10 px-4 py-2 rounded-full text-xs font-bold">
            <span className="material-symbols-outlined text-sm font-bold">bar_chart</span>
            Reportes
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider">{card.title}</span>
              <span className={`material-symbols-outlined p-2 rounded-xl text-lg font-bold ${card.color}`}>
                {card.icon}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-sans text-3xl font-extrabold text-gray-900">{card.value}</span>
              {card.trend && (
                <span className="font-sans text-xs font-extrabold text-emerald-600 ml-2 inline-flex items-center">
                  <span className="material-symbols-outlined text-sm font-bold">trending_up</span> {card.trend}
                </span>
              )}
              {card.progress !== undefined && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${card.progress}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Search and Filter */}
      <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80 rounded-full border border-indigo-50 bg-white overflow-hidden shadow-inner px-4 py-2.5 flex items-center">
          <span className="material-symbols-outlined text-gray-400 text-lg mr-2 font-bold">search</span>
          <input
            type="text"
            placeholder="Buscar familias, usuarios..."
            className="w-full bg-transparent border-none text-xs focus:ring-0 focus:outline-none placeholder:text-gray-400 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="bg-white border border-indigo-50 shadow-sm text-gray-700 font-sans text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-sm font-bold">filter_list</span>
          Filtrar
        </button>
      </section>

      {/* Recent Families Table */}
      <section className="bg-white rounded-3xl border border-indigo-50/60 shadow-xl shadow-indigo-100/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-indigo-50 bg-slate-50/50">
          <h3 className="font-sans text-sm font-extrabold text-gray-900 uppercase tracking-wider">Familias Activas Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-indigo-50 font-sans text-[10px] font-bold text-gray-400 bg-slate-50/30 uppercase tracking-wider">
                <th className="py-4 px-6">Nombre de la Familia</th>
                <th className="py-4 px-6">Miembros</th>
                <th className="py-4 px-6">Completado Semanal</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-gray-700">
              {filteredFamilies.map((family, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-brand-light text-brand-dark font-extrabold flex items-center justify-center">
                        {family.avatarLetter}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{family.name}</p>
                        <p className="text-[10px] text-gray-400">{family.created}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex -space-x-1.5">
                      {family.membersAvatars.map((url, avIdx) => (
                        <img
                          key={avIdx}
                          className="w-7 h-7 rounded-full border-2 border-white object-cover bg-gray-100 shadow-sm"
                          src={url}
                          alt="Member"
                        />
                      ))}
                      {family.extraCount !== undefined && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-150 text-[10px] font-bold text-gray-500 flex items-center justify-center shadow-sm">
                          +{family.extraCount}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${family.color}`} style={{ width: `${family.progress}%` }}></div>
                      </div>
                      <span className="font-bold text-gray-900">{family.progress}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-base font-bold">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
