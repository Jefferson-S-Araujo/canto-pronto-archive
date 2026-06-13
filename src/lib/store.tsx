import { createContext, useContext, useState, type ReactNode } from "react";

export type Certification = "parede_seca" | "pendente" | "atencao";

export type Property = {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  price: number;
  deposit: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  score: number;
  certification: Certification;
  image: string;
  amenities: string[];
  description: string;
  ownerId: string;
};

export type User = {
  id: string;
  name: string;
  role: "tenant" | "owner" | "admin";
  docStatus: "none" | "pending" | "approved" | "rejected";
  creditScore: number | null; // null = não enviou
  creditApproved: boolean;
};

export type ProposalPropertySnapshot = {
  title: string;
  neighborhood: string;
  image: string;
  price: number;
  deposit: number;
};

export type Proposal = {
  id: string;
  propertyId: string;
  tenantId: string;
  status: "pending" | "accepted" | "signed" | "escrow" | "active" | "ended";
  escrowAmount: number;
  checkedIn: boolean;
  property: ProposalPropertySnapshot;
};

export type Ticket = {
  id: string;
  propertyId: string;
  tenantId: string;
  title: string;
  photo?: string;
  createdAt: number;
  deadlineHours: number;
  ownerResponded: boolean;
  autonomousRepair?: { invoice: string; amount: number };
};

export type Dispute = {
  id: string;
  proposalId: string;
  reason: string;
  status: "open" | "resolved";
  resolution?: string;
};

const SAMPLE_PROPS: Property[] = [
  {
    id: "p1",
    title: "Apartamento Mobiliado - Barra",
    address: "Av. Oceânica, Barra, Salvador/BA",
    neighborhood: "Barra",
    price: 2500,
    deposit: 2500,
    area: 65,
    bedrooms: 2,
    bathrooms: 2,
    score: 95,
    certification: "parede_seca",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
    amenities: ["Wi-Fi", "Máquina de lavar", "Ar condicionado", "TV", "Cozinha equipada"],
    description: "Vista mar, totalmente mobiliado, próximo ao Farol da Barra.",
    ownerId: "u_owner",
  },
  {
    id: "p2",
    title: "Estúdio Completo - Rio Vermelho",
    address: "Rua da Paciência, Rio Vermelho, Salvador/BA",
    neighborhood: "Rio Vermelho",
    price: 1800,
    deposit: 1800,
    area: 45,
    bedrooms: 1,
    bathrooms: 1,
    score: 98,
    certification: "parede_seca",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
    amenities: ["Wi-Fi", "Ar condicionado", "Cozinha equipada", "Smart TV"],
    description: "Coração boêmio de Salvador. Estúdio aconchegante e moderno.",
    ownerId: "u_owner",
  },
  {
    id: "p3",
    title: "Apartamento 3 Quartos - Imbuí",
    address: "Rua Silveira Martins, Imbuí, Salvador/BA",
    neighborhood: "Imbuí",
    price: 3200,
    deposit: 3200,
    area: 85,
    bedrooms: 3,
    bathrooms: 2,
    score: 92,
    certification: "parede_seca",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
    amenities: ["Wi-Fi", "Máquina de lavar", "Ar condicionado", "Garagem", "Área de lazer"],
    description: "Amplo, arejado, ideal para famílias. Próximo a shoppings.",
    ownerId: "u_owner",
  },
];

type Store = {
  user: User;
  properties: Property[];
  proposals: Proposal[];
  tickets: Ticket[];
  disputes: Dispute[];
  // user actions
  setRole: (r: User["role"]) => void;
  submitDocs: (name: string, docName: string) => "match" | "mismatch";
  approveUser: (id: string) => void;
  uploadCredit: (score: number) => void;
  // properties
  addProperty: (p: Omit<Property, "id" | "ownerId" | "certification" | "score">) => string;
  setCertification: (id: string, c: Certification, score: number) => void;
  // proposals
  createProposal: (propertyId: string, snapshot?: ProposalPropertySnapshot) => string;
  signAndPay: (id: string) => void;
  confirmCheckin: (id: string) => void;
  // tickets
  openTicket: (t: Omit<Ticket, "id" | "createdAt" | "deadlineHours" | "ownerResponded">) => void;
  respondTicket: (id: string) => void;
  autonomousRepair: (id: string, invoice: string, amount: number) => void;
  // disputes
  openDispute: (proposalId: string, reason: string) => void;
  resolveDispute: (id: string, resolution: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({
    id: "u1",
    name: "Convidado",
    role: "tenant",
    docStatus: "none",
    creditScore: null,
    creditApproved: false,
  });
  const [properties, setProperties] = useState<Property[]>(SAMPLE_PROPS);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const store: Store = {
    user,
    properties,
    proposals,
    tickets,
    disputes,
    setRole: (r) => setUser((u) => ({ ...u, role: r })),
    submitDocs: (name, docName) => {
      const match = name.trim().toLowerCase() === docName.trim().toLowerCase() && name.trim().length > 2;
      setUser((u) => ({ ...u, name, docStatus: match ? "pending" : "rejected" }));
      return match ? "match" : "mismatch";
    },
    approveUser: () => setUser((u) => ({ ...u, docStatus: "approved" })),
    uploadCredit: (score) =>
      setUser((u) => ({ ...u, creditScore: score, creditApproved: score >= 700 })),
    addProperty: (p) => {
      const id = "p" + (properties.length + 1) + Date.now();
      setProperties((arr) => [
        ...arr,
        { ...p, id, ownerId: user.id, certification: "pendente", score: 0 },
      ]);
      return id;
    },
    setCertification: (id, c, score) =>
      setProperties((arr) => arr.map((p) => (p.id === id ? { ...p, certification: c, score } : p))),
    createProposal: (propertyId, snapshot) => {
      const id = "pr" + Date.now();
      const prop = properties.find((p) => p.id === propertyId);
      const snap: ProposalPropertySnapshot = snapshot ?? (prop
        ? { title: prop.title, neighborhood: prop.neighborhood, image: prop.image, price: prop.price, deposit: prop.deposit }
        : { title: "Imóvel", neighborhood: "—", image: "", price: 0, deposit: 0 });
      const extraDeposit = user.creditApproved ? 0 : snap.deposit;
      setProposals((arr) => [
        ...arr,
        {
          id,
          propertyId,
          tenantId: user.id,
          status: "pending",
          escrowAmount: snap.price + snap.deposit + extraDeposit,
          checkedIn: false,
          property: snap,
        },
      ]);
      return id;
    },
    signAndPay: (id) =>
      setProposals((arr) => arr.map((p) => (p.id === id ? { ...p, status: "escrow" } : p))),
    confirmCheckin: (id) =>
      setProposals((arr) =>
        arr.map((p) => (p.id === id ? { ...p, status: "active", checkedIn: true } : p)),
      ),
    openTicket: (t) => {
      setTickets((arr) => [
        ...arr,
        { ...t, id: "t" + Date.now(), createdAt: Date.now(), deadlineHours: 72, ownerResponded: false },
      ]);
    },
    respondTicket: (id) =>
      setTickets((arr) => arr.map((t) => (t.id === id ? { ...t, ownerResponded: true } : t))),
    autonomousRepair: (id, invoice, amount) =>
      setTickets((arr) =>
        arr.map((t) => (t.id === id ? { ...t, autonomousRepair: { invoice, amount } } : t)),
      ),
    openDispute: (proposalId, reason) =>
      setDisputes((arr) => [
        ...arr,
        { id: "d" + Date.now(), proposalId, reason, status: "open" },
      ]),
    resolveDispute: (id, resolution) =>
      setDisputes((arr) =>
        arr.map((d) => (d.id === id ? { ...d, status: "resolved", resolution } : d)),
      ),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}
