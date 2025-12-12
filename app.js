import { db } from "./firebase.js"; // ← removido o 'storage'

import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const SECTORS = [
  "Coleira de mica","Coleira cerâmica","Tubular","Auto-Clave",
  "Cartucho","Placa de mica","Bainha","Placa só mica"
];

let orders = [];
let editingId = null;

// referências de DOM
const searchInput       = document.getElementById("searchInput");
const newOrderBtn       = document.getElementById("newOrderBtn");
const ordersList        = document.getElementById("ordersList");
const summaryContainer  = document.getElementById("summary");
const sectorFilter      = document.getElementById("sectorFilter");
const showTotalsBtn     = document.getElementById("showTotalsBySector");
const totalsBySectorDiv = document.getElementById("totalsBySector");
const statusBtns        = document.querySelectorAll(".filter-btn");
const startDateInput    = document.getElementById("startDate");
const endDateInput      = document.getElementById("endDate");
const clearDateFilterBtn = document.getElementById("clearDateFilter");

// modal
const modal         = document.getElementById("orderModal");
const closeBtn      = modal.querySelector(".close-btn");
const form          = document.getElementById("orderForm");
const modalTitle    = document.getElementById("modalTitle");
const fld = {
  number:    document.getElementById("orderNumber"),
  company:   document.getElementById("company"),
  sector:    document.getElementById("sector"),
  qty:       document.getElementById("quantity"),
  desc:      document.getElementById("description"),
  notes:     document.getElementById("notes"),
  entry:     document.getElementById("entryDate"),
  exit:      document.getElementById("exitDate"),
  photo:     document.getElementById("photo"),
  fichaTirada: document.getElementById("fichaTirada")
};

// popula dropdown de setores
SECTORS.forEach(s => {
  const opt = document.createElement("option");
  opt.value = s; opt.textContent = s;
  sectorFilter.appendChild(opt);
  fld.sector.appendChild(opt.cloneNode(true));
});

// listeners básicos
newOrderBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
form.addEventListener("submit", saveOrder);
searchInput.addEventListener("input", renderAll);
sectorFilter.addEventListener("change", renderAll);
showTotalsBtn.addEventListener("click", renderTotalsBySector);
statusBtns.forEach(b => b.addEventListener("click", () => {
  statusBtns.forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  renderAll();
}));

startDateInput.addEventListener("change", renderAll);
endDateInput.addEventListener("change", renderAll);
clearDateFilterBtn.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  renderAll();
});

// observa a coleção “pedidos”
const pedidosCol = collection(db, "pedidos");
onSnapshot(pedidosCol, q => {
  orders = [];
  q.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
  renderAll();
});

function renderAll() {
  renderSummary();
  renderOrders();
}

function renderSummary() {
  const total = orders.length;
  const hoje = new Date().toISOString().slice(0,10);
  const emProd = orders.filter(o=>!o.finalizado).length;
  const venceHoje = orders.filter(o=>!o.finalizado && o.exit===hoje).length;
  const atras = orders.filter(o=>!o.finalizado && o.exit<hoje).length;
  const fin = orders.filter(o=>o.finalizado).length;
  const fichaTirada = orders.filter(o=>o.fichaTirada).length;

  const data = [
    { label:"Total de Pedidos", value:total, color:"#0d47a1" },
    { label:"Em Produção",    value:emProd, color:"#fbc02d" },
    { label:"Vencem Hoje",    value:venceHoje, color:"#fb8c00" },
    { label:"Atrasados",      value:atras, color:"#e53935" },
    { label:"Finalizados",    value:fin, color:"#4caf50" },
    { label:"Ficha Tirada",   value:fichaTirada, color:"#2196f3" },
  ];
  summaryContainer.innerHTML = "";
  data.forEach(d => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderColor = d.color;
    card.innerHTML = `<h2 style="color:${d.color}">${d.value}</h2><p>${d.label}</p>`;
    summaryContainer.appendChild(card);
  });
}

// renderiza lista de pedidos
function renderOrders() {
  const filterStatus = document.querySelector(".filter-btn.active").dataset.status;
  const filterSector = sectorFilter.value;
  const term = searchInput.value.trim().toLowerCase();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  let list = [...orders];
  // status
  list = list.filter(o => {
    if (filterStatus==="all") return true;
    if (filterStatus==="em_producao") return !o.finalizado;
    if (filterStatus==="finalizados") return o.finalizado;
    if (filterStatus==="vence_hoje") return (!o.finalizado && o.exit===new Date().toISOString().slice(0,10));
    if (filterStatus==="atrasados") return (!o.finalizado && o.exit<new Date().toISOString().slice(0,10));
    if (filterStatus==="ficha_tirada") return o.fichaTirada;
    if (filterStatus==="sem_ficha") return !o.fichaTirada;
  });
  // setor
  if (filterSector!=="all") list = list.filter(o=>o.sector===filterSector);
  // busca
  if (term) list = list.filter(o=>o.number.toLowerCase().includes(term));
  // filtro de data
  if (startDate && endDate) {
    list = list.filter(o => {
      const exitDate = new Date(o.exit);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return exitDate >= start && exitDate <= end;
    });
  } else if (startDate) {
    list = list.filter(o => new Date(o.exit) >= new Date(startDate));
  } else if (endDate) {
    list = list.filter(o => new Date(o.exit) <= new Date(endDate));
  }

  ordersList.innerHTML = "";
  list.forEach(o => {
    const card = document.createElement("div");
    card.className = "order-card " + (o.finalizado ? "finalizado" : (o.exit<new Date().toISOString().slice(0,10) ? "atrasados" : ""));
    card.innerHTML = `
      <h3>Pedido ${o.number}</h3>
      <span class="status">${o.finalizado?"Finalizado":"Em Produção"}</span>
      <p><strong>Empresa:</strong> ${o.company}</p>
      <p><strong>Setor:</strong> ${o.sector}</p>
      <p><strong>Descrição:</strong> ${o.desc}</p>
      ${o.notes ? `<p><strong>Obs:</strong> ${o.notes}</p>` : ""}
      <p><strong>Qtd:</strong> ${o.qty}</p>
      <p><strong>Entrada:</strong> ${new Date(o.entry).toLocaleDateString("pt-BR")} &nbsp; <strong>Saída:</strong> ${new Date(o.exit).toLocaleDateString("pt-BR")}</p>
      ${o.fichaTirada ? `<p><strong>Ficha Tirada:</strong> Sim</p>` : ""}
      ${o.photoData ? `<img src="${o.photoData}" alt="Foto do pedido">` : ""}
      <div class="actions">
        <button class="btn btn-save" onclick="toggleFinalize('${o.id}',${o.finalizado})">
          ${o.finalizado?"↺ Desfazer":"✔ Finalizar"}
        </button>
        <button class="btn ${o.fichaTirada ? 'btn-ficha-tirada' : 'btn-ficha-nao-tirada'}" onclick="toggleFichaTirada('${o.id}',${o.fichaTirada})">
          ${o.fichaTirada ? '📋 Ficha Tirada' : '📋 Ficha Não Tirada'}
        </button>
        <button class="btn btn-secondary" onclick="editOrder('${o.id}')">✏️ Editar</button>
        <button class="btn btn-cancel" onclick="deleteOrder('${o.id}')">🗑 Excluir</button>
      </div>
    `;
    ordersList.appendChild(card);
  });
}

// totais por setor
function renderTotalsBySector() {
  const pieces = {}, count = {};
  orders.forEach(o => {
    if (!pieces[o.sector]) pieces[o.sector]=0, count[o.sector]=0;
    pieces[o.sector]+= Number(o.qty);
    count[o.sector]++;
  });
  totalsBySectorDiv.innerHTML = "";
  Object.keys(pieces).forEach(sec => {
    const card = document.createElement("div");
    card.className="sector-card";
    card.innerHTML = `<strong>${sec}</strong><p>${pieces[sec]} peças em ${count[sec]} pedidos</p>`;
    totalsBySectorDiv.appendChild(card);
  });
}

// modal
function openModal(order=null) {
  modal.style.display="flex";
  if (order) {
    editingId = order.id;
    modalTitle.textContent="Editar Pedido";
    fld.number.value = order.number;
    fld.company.value= order.company;
    fld.sector.value = order.sector;
    fld.qty.value    = order.qty;
    fld.desc.value   = order.desc;
    fld.notes.value  = order.notes;
    fld.entry.value  = order.entry;
    fld.exit.value   = order.exit;
    fld.fichaTirada.checked = order.fichaTirada || false;
  } else {
    editingId = null;
    modalTitle.textContent="Cadastrar Novo Pedido";
    form.reset();
    fld.qty.value = 1;
  }
}

function closeModal() {
  modal.style.display="none";
}

// 🆕 salvar com imagem base64
async function saveOrder(e) {
  e.preventDefault();
  const errorDiv = document.getElementById("errorMsg");
  errorDiv.textContent = "";

  try {
    const data = {
      number: fld.number.value,
      company: fld.company.value,
      sector: fld.sector.value,
      qty: fld.qty.value,
      desc: fld.desc.value,
      notes: fld.notes.value,
      entry: fld.entry.value,
      exit: fld.exit.value,
      finalizado: false,
      fichaTirada: fld.fichaTirada.checked,
      photoData: ""
    };

    // Converte imagem para base64
    if (fld.photo.files.length) {
      const file = fld.photo.files[0];
      const base64 = await toBase64(file);
      data.photoData = base64;
    }

    if (editingId) {
      await updateDoc(doc(db, "pedidos", editingId), data);
    } else {
      await addDoc(collection(db, "pedidos"), data);
    }

    closeModal();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "Erro ao salvar pedido: " + err.message;
  }
}

// utilitário base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ações globais
window.editOrder = async id => {
  const o = orders.find(x=>x.id===id);
  openModal(o);
};
window.deleteOrder = async id => {
  if (confirm("Excluir este pedido?")) {
    await deleteDoc(doc(db, "pedidos", id));
  }
};
window.toggleFinalize = async (id, done) => {
  await updateDoc(doc(db, "pedidos", id), { finalizado: !done });
};

window.toggleFichaTirada = async (id, fichaTirada) => {
  await updateDoc(doc(db, "pedidos", id), { fichaTirada: !fichaTirada });
};

