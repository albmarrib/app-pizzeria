import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./config";

const initialProducts = [
  {
    id: "pizza-margarita",
    name: "Pizza Margarita",
    description: "Salsa de tomate, mozzarella fior di latte, albahaca fresca y aceite de oliva.",
    price: 10.50,
    category: "Pizzas",
    sectionId: "sec-horno",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop",
    allergenIds: ["all-gluten", "all-lactosa"],
    baseIngredients: "Salsa de tomate, mozzarella fior di latte, albahaca fresca y aceite de oliva.",
    ingredients: [
      { name: "Salsa de tomate", isRemovable: true, price: 0 },
      { name: "Mozzarella fior di latte", isRemovable: true, price: 0 },
      { name: "Albahaca", isRemovable: true, price: 0 }
    ],
    extraIngredients: [
      { name: "Extra Mozzarella", price: 1.50 },
      { name: "Champiñones", price: 1.00 },
      { name: "Jamón cocido", price: 1.50 }
    ]
  },
  {
    id: "pizza-pepperoni",
    name: "Pepperoni Lovers",
    description: "Extra de pepperoni crujiente, mozzarella fundida y salsa de tomate casera.",
    price: 13.00,
    category: "Pizzas",
    sectionId: "sec-horno",
    imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=600&auto=format&fit=crop",
    allergenIds: ["all-gluten", "all-lactosa"],
    baseIngredients: "Salsa de tomate casera, mozzarella fundida y extra de pepperoni.",
    ingredients: [
      { name: "Salsa de tomate", isRemovable: true, price: 0 },
      { name: "Mozzarella", isRemovable: true, price: 0 },
      { name: "Pepperoni", isRemovable: true, price: 0 }
    ],
    extraIngredients: [
      { name: "Cebolla", price: 0.50 },
      { name: "Jalapeños", price: 1.00 },
      { name: "Extra Pepperoni", price: 2.00 }
    ]
  },
  {
    id: "pizza-barbacoa",
    name: "Barbacoa Especial",
    description: "Ternera especiada, bacon, cebolla roja, mozzarella y salsa barbacoa.",
    price: 14.50,
    category: "Pizzas",
    sectionId: "sec-horno",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop",
    allergenIds: ["all-gluten", "all-lactosa"],
    baseIngredients: "Salsa barbacoa, mozzarella, ternera especiada, bacon y cebolla roja.",
    ingredients: [
      { name: "Salsa barbacoa", isRemovable: true, price: 0 },
      { name: "Mozzarella", isRemovable: true, price: 0 },
      { name: "Ternera", isRemovable: true, price: 0 },
      { name: "Bacon", isRemovable: true, price: 0 },
      { name: "Cebolla", isRemovable: true, price: 0 }
    ],
    extraIngredients: [
      { name: "Extra Ternera", price: 2.00 },
      { name: "Pollo", price: 1.50 }
    ]
  },
  {
    id: "entrante-tequenos",
    name: "Tequeños de Queso (5 uds)",
    description: "Deliciosos palitos de masa rellenos de queso fundido, con salsa de ajo.",
    price: 6.50,
    category: "Entrantes",
    sectionId: "sec-horno",
    imageUrl: "https://images.unsplash.com/photo-1623341214825-9f4f963727da?q=80&w=600&auto=format&fit=crop",
    allergenIds: ["all-gluten", "all-lactosa", "all-huevos"],
    baseIngredients: "Masa rellena de queso fundido, con salsa de ajo.",
    ingredients: [],
    extraIngredients: []
  },
  {
    id: "bebida-cola",
    name: "Refresco de Cola",
    description: "Lata 33cl",
    price: 2.50,
    category: "Bebidas",
    sectionId: "sec-bar",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop",
    allergenIds: [],
    baseIngredients: "",
    ingredients: [],
    extraIngredients: []
  }
];

const initialSections = [
  { id: "sec-horno", name: "Horno / Cocina Caliente", columns: ["Pendiente", "Preparando", "Horno", "Listo"] },
  { id: "sec-bar", name: "Bar / Bebidas", columns: ["Pendiente", "Listo"] }
];

const initialCategories = [
  { id: "cat-pizzas", name: "Pizzas", order: 0, imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop" },
  { id: "cat-entrantes", name: "Entrantes", order: 1, imageUrl: "https://images.unsplash.com/photo-1623341214825-9f4f963727da?q=80&w=600&auto=format&fit=crop" },
  { id: "cat-bebidas", name: "Bebidas", order: 2, imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop" }
];

const initialAllergens = [
  { id: "all-gluten", name: "Gluten", icon: "🌾" },
  { id: "all-lactosa", name: "Lácteos", icon: "🥛" },
  { id: "all-huevos", name: "Huevos", icon: "🥚" }
];

const initialIngredients = [
  { id: "ing-queso", name: "Doble Queso", price: 1.50, isActive: true },
  { id: "ing-pepperoni", name: "Extra Pepperoni", price: 2.00, isActive: true },
  { id: "ing-bacon", name: "Bacon Crujiente", price: 1.50, isActive: true }
];

export const seedProductsIfEmpty = async () => {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log("Colección de productos vacía. Insertando datos semilla Fase 7...");
      const batch = writeBatch(db);
      
      initialProducts.forEach((p) => batch.set(doc(collection(db, "products"), p.id), p));
      initialCategories.forEach((c) => batch.set(doc(collection(db, "categories"), c.id), c));
      initialAllergens.forEach((a) => batch.set(doc(collection(db, "allergens"), a.id), a));
      initialIngredients.forEach((i) => batch.set(doc(collection(db, "ingredients"), i.id), i));
      initialSections.forEach((s) => batch.set(doc(collection(db, "preparation_sections"), s.id), s));
      
      await batch.commit();
      console.log("Productos Fase 7 inicializados exitosamente.");
    }
  } catch (error) {
    console.error("Error inicializando productos:", error);
  }
};

export const forceSeedProducts = async () => {
  try {
    console.log("Forzando inicialización de datos Fase 7...");
    const batch = writeBatch(db);
    
    initialProducts.forEach((p) => batch.set(doc(collection(db, "products"), p.id), p));
    initialCategories.forEach((c) => batch.set(doc(collection(db, "categories"), c.id), c));
    initialAllergens.forEach((a) => batch.set(doc(collection(db, "allergens"), a.id), a));
    initialIngredients.forEach((i) => batch.set(doc(collection(db, "ingredients"), i.id), i));
    initialSections.forEach((s) => batch.set(doc(collection(db, "preparation_sections"), s.id), s));
    
    await batch.commit();
    console.log("Datos re-inicializados exitosamente.");
    alert("Base de datos actualizada con éxito (Categorías, Productos, Alérgenos, Secciones). Por favor recarga la página.");
  } catch (error) {
    console.error("Error forzando inicialización de datos:", error);
    alert("Error al actualizar la base de datos.");
  }
};
