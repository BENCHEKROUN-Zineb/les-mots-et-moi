import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { Plus, Search, Trash2, ArrowUp, BookOpen, Eye, Edit2, X, Star, Calendar, MessageSquare, History, Loader2 } from 'lucide-react';

const INITIAL_FORM = {
  titre: '',
  auteur: '',
  statut: 'À lire',
  description: '',
  langue: 'Français',
  nb_pages: '',
  prix: '',
  date_achat: '',
  lieu_achat: '',
  format: 'Papier',
  tomes: 1,
  image: ''
};

const STATUTS_ORDRE = ['À lire', 'En cours', 'Terminé'];

export default function App() {
  const [livres, setLivres] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statutFiltre, setStatutFiltre] = useState('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const [formLivre, setFormLivre] = useState(INITIAL_FORM);

  // Gestion des avis multiples
  const [showAvisForm, setShowAvisForm] = useState(false);
  const [editingAvisId, setEditingAvisId] = useState(null);
  const [formAvis, setFormAvis] = useState({
    note: 5,
    date_lecture: '',
    date_fin_lecture: '',
    commentaire: ''
  });

  // Écoute en temps réel de Firestore
  useEffect(() => {
    const q = query(collection(db, 'livres'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        avis: Array.isArray(docSnap.data().avis) ? docSnap.data().avis : []
      }));
      setLivres(docsData);
      setLoading(false);

      // Si un livre est actuellement ouvert dans la modal, on met à jour ses données
      if (selectedBook) {
        const updatedSelected = docsData.find(b => b.id === selectedBook.id);
        if (updatedSelected) {
          setSelectedBook(updatedSelected);
        }
      }
    }, (error) => {
      console.error("Erreur Firestore :", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedBook?.id]);

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const countByStatut = (st) => {
    if (st === 'Tous') return livres.length;
    return livres.filter((b) => b.statut === st).length;
  };

  const getNoteMoyenne = (avisList) => {
    if (!Array.isArray(avisList) || avisList.length === 0) return null;
    const total = avisList.reduce((acc, a) => acc + Number(a?.note || 0), 0);
    return (total / avisList.length).toFixed(1);
  };

  // Changement rapide du statut au clic sur le badge
  const toggleStatutRapide = async (e, livre) => {
    e.stopPropagation();
    const currentIndex = STATUTS_ORDRE.indexOf(livre.statut);
    const nextIndex = (currentIndex + 1) % STATUTS_ORDRE.length;
    const newStatut = STATUTS_ORDRE[nextIndex];

    try {
      const bookRef = doc(db, 'livres', livre.id);
      await updateDoc(bookRef, { statut: newStatut });
    } catch (err) {
      console.error("Erreur mise à jour statut :", err);
    }
  };

  // Changement direct du statut depuis la modal
  const handleStatutChangeDirect = async (newStatut, livreId) => {
    try {
      const bookRef = doc(db, 'livres', livreId);
      await updateDoc(bookRef, { statut: newStatut });
    } catch (err) {
      console.error("Erreur mise à jour statut :", err);
    }
  };

  const filteredBooks = livres.filter((l) => {
    const matchesSearch =
      (l.titre || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.auteur || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.langue || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatut = statutFiltre === 'Tous' || l.statut === statutFiltre;
    return matchesSearch && matchesStatut;
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormLivre(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (livre) => {
    setEditingId(livre.id);
    setFormLivre({
      titre: livre.titre || '',
      auteur: livre.auteur || '',
      statut: livre.statut || 'À lire',
      description: livre.description || '',
      langue: livre.langue || 'Français',
      nb_pages: livre.nb_pages || '',
      prix: livre.prix || '',
      date_achat: livre.date_achat || '',
      lieu_achat: livre.lieu_achat || '',
      format: livre.format || 'Papier',
      tomes: livre.tomes || 1,
      image: livre.image || ''
    });
    setIsModalOpen(true);
    if (selectedBook) setSelectedBook(null);
  };

  // Sauvegarder dans Firestore (Ajout ou Modification)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formLivre.titre || !formLivre.auteur) return;

    const formattedData = {
      ...formLivre,
      nb_pages: formLivre.nb_pages ? Number(formLivre.nb_pages) : null,
      prix: formLivre.prix ? parseFloat(formLivre.prix) : null,
      tomes: formLivre.tomes ? Number(formLivre.tomes) : 1,
      image: formLivre.image || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400'
    };

    try {
      if (editingId) {
        const bookRef = doc(db, 'livres', editingId);
        await updateDoc(bookRef, formattedData);
      } else {
        await addDoc(collection(db, 'livres'), {
          ...formattedData,
          avis: [],
          createdAt: serverTimestamp()
        });
      }
      setFormLivre(INITIAL_FORM);
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement :", err);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  // Supprimer un livre de Firestore
  const handleDelete = async (id) => {
    if (window.confirm('Supprimer définitivement ce livre ?')) {
      try {
        await deleteDoc(doc(db, 'livres', id));
        if (selectedBook && selectedBook.id === id) {
          setSelectedBook(null);
        }
      } catch (err) {
        console.error("Erreur suppression :", err);
      }
    }
  };

  // Gestion des avis
  const openNewAvisForm = () => {
    setEditingAvisId(null);
    setFormAvis({ note: 5, date_lecture: '', date_fin_lecture: '', commentaire: '' });
    setShowAvisForm(true);
  };

  const openEditAvisForm = (avis) => {
    setEditingAvisId(avis.id_avis);
    setFormAvis({
      note: avis.note || 5,
      date_lecture: avis.date_lecture || '',
      date_fin_lecture: avis.date_fin_lecture || '',
      commentaire: avis.commentaire || ''
    });
    setShowAvisForm(true);
  };

  const handleSaveAvis = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;

    const currentAvis = Array.isArray(selectedBook.avis) ? selectedBook.avis : [];
    let updatedAvisList = [];

    if (editingAvisId) {
      updatedAvisList = currentAvis.map((a) =>
        a.id_avis === editingAvisId ? { ...a, ...formAvis } : a
      );
    } else {
      const newAvis = {
        id_avis: Date.now(),
        ...formAvis
      };
      updatedAvisList = [newAvis, ...currentAvis];
    }

    try {
      const bookRef = doc(db, 'livres', selectedBook.id);
      await updateDoc(bookRef, { avis: updatedAvisList });
      setShowAvisForm(false);
      setEditingAvisId(null);
    } catch (err) {
      console.error("Erreur enregistrement avis :", err);
    }
  };

  const handleDeleteAvis = async (idAvis) => {
    if (!window.confirm('Supprimer cette note de lecture ?')) return;

    const currentAvis = Array.isArray(selectedBook.avis) ? selectedBook.avis : [];
    const updatedAvisList = currentAvis.filter((a) => a.id_avis !== idAvis);
    
    try {
      const bookRef = doc(db, 'livres', selectedBook.id);
      await updateDoc(bookRef, { avis: updatedAvisList });
    } catch (err) {
      console.error("Erreur suppression avis :", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold">Les Mots et Moi</h1>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter un livre
          </button>
        </header>

        {/* Barre de Recherche & Filtres */}
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un titre, auteur, langue..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
            {['Tous', 'En cours', 'À lire', 'Terminé'].map((st) => (
              <button
                key={st}
                onClick={() => setStatutFiltre(st)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                  statutFiltre === st
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <span>{st}</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  statutFiltre === st ? 'bg-indigo-800 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {countByStatut(st)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grille des Livres */}
        <div>
          <h2 className="text-xl font-bold mb-4">Ma Bibliothèque</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Chargement de votre bibliothèque cloud...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-800 text-slate-400">
              Aucun livre trouvé.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredBooks.map((livre) => {
                const noteMoyenne = getNoteMoyenne(livre.avis);
                const nbLectures = Array.isArray(livre.avis) ? livre.avis.length : 0;

                return (
                  <div
                    key={livre.id}
                    className="group bg-slate-800/90 rounded-2xl overflow-hidden border border-slate-700/60 hover:-translate-y-1.5 hover:shadow-xl hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                  >
                    <div 
                      onClick={() => { setSelectedBook(livre); setShowAvisForm(false); }}
                      className="relative aspect-[2/3] bg-slate-900 overflow-hidden cursor-pointer"
                    >
                      <img src={livre.image} alt={livre.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      
                      <button
                        type="button"
                        onClick={(e) => toggleStatutRapide(e, livre)}
                        title="Cliquer pour changer le statut"
                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full text-white shadow-lg transition transform hover:scale-110 active:scale-95 cursor-pointer z-10 ${
                          livre.statut === 'Terminé' 
                            ? 'bg-emerald-500 hover:bg-emerald-600' 
                            : livre.statut === 'En cours' 
                            ? 'bg-blue-500 hover:bg-blue-600' 
                            : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                      >
                        {livre.statut} ↻
                      </button>

                      {noteMoyenne && (
                        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[11px] font-bold rounded-lg bg-black/80 text-amber-300 flex items-center gap-1 shadow-md backdrop-blur-sm">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {noteMoyenne}
                          {nbLectures > 1 && (
                            <span className="text-[9px] text-slate-300 font-normal">({nbLectures}x)</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div onClick={() => { setSelectedBook(livre); setShowAvisForm(false); }} className="cursor-pointer">
                        <h3 className="font-bold text-white text-sm line-clamp-1">{livre.titre}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{livre.auteur}</p>
                        {livre.prix && (
                          <p className="text-xs text-indigo-400 font-semibold mt-1">{livre.prix.toFixed(2)} DH</p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setSelectedBook(livre); setShowAvisForm(false); }}
                            className="text-slate-400 hover:text-indigo-400 p-1"
                            title="Détails & Lectures"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => openEditModal(livre)}
                            className="text-slate-400 hover:text-amber-400 p-1"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button 
                          onClick={() => handleDelete(livre.id)} 
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL AJOUT / MODIFICATION DU LIVRE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Modifier le livre' : 'Ajouter un nouveau livre'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Titre *</label>
                  <input
                    type="text"
                    required
                    value={formLivre.titre}
                    onChange={(e) => setFormLivre({ ...formLivre, titre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Auteur *</label>
                  <input
                    type="text"
                    required
                    value={formLivre.auteur}
                    onChange={(e) => setFormLivre({ ...formLivre, auteur: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formLivre.description}
                  onChange={(e) => setFormLivre({ ...formLivre, description: e.target.value })}
                  placeholder="Résumé du livre..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Statut</label>
                  <select
                    value={formLivre.statut}
                    onChange={(e) => setFormLivre({ ...formLivre, statut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="À lire">À lire</option>
                    <option value="En cours">En cours</option>
                    <option value="Terminé">Terminé</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Langue</label>
                  <input
                    type="text"
                    value={formLivre.langue}
                    onChange={(e) => setFormLivre({ ...formLivre, langue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Format</label>
                  <select
                    value={formLivre.format}
                    onChange={(e) => setFormLivre({ ...formLivre, format: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="Papier">Papier</option>
                    <option value="PDF">PDF</option>
                    <option value="Emprunté">Emprunté</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Tome(s)</label>
                  <input
                    type="number"
                    min="1"
                    value={formLivre.tomes}
                    onChange={(e) => setFormLivre({ ...formLivre, tomes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Nb de pages</label>
                  <input
                    type="number"
                    value={formLivre.nb_pages}
                    onChange={(e) => setFormLivre({ ...formLivre, nb_pages: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Prix (DH)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formLivre.prix}
                    onChange={(e) => setFormLivre({ ...formLivre, prix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Date d'achat</label>
                  <input
                    type="date"
                    value={formLivre.date_achat}
                    onChange={(e) => setFormLivre({ ...formLivre, date_achat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Lieu d'achat</label>
                  <input
                    type="text"
                    placeholder="ex: Librairie..."
                    value={formLivre.lieu_achat}
                    onChange={(e) => setFormLivre({ ...formLivre, lieu_achat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">URL de l'image</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formLivre.image}
                  onChange={(e) => setFormLivre({ ...formLivre, image: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md"
                >
                  {editingId ? 'Sauvegarder' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DÉTAILS & GESTION DES RELECTURES */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 my-6 max-h-[90vh] overflow-y-auto">
            
            <div className="relative aspect-[16/9] bg-slate-900">
              <img src={selectedBook.image} alt={selectedBook.titre} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
                {STATUTS_ORDRE.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatutChangeDirect(st, selectedBook.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      selectedBook.statut === st
                        ? st === 'Terminé' ? 'bg-emerald-500 text-white' : st === 'En cours' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 pt-0 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedBook.titre}</h3>
                  <p className="text-sm text-indigo-400 font-medium">{selectedBook.auteur}</p>
                </div>
                <button 
                  onClick={() => openEditModal(selectedBook)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>

              {selectedBook.description && (
                <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 leading-relaxed">
                  {selectedBook.description}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Langue</span>
                  <span className="text-slate-200 font-medium">{selectedBook.langue || '-'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Format</span>
                  <span className="text-slate-200 font-medium">{selectedBook.format || '-'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Pages</span>
                  <span className="text-slate-200 font-medium">{selectedBook.nb_pages ? `${selectedBook.nb_pages} p.` : '-'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Prix</span>
                  <span className="text-slate-200 font-medium">{selectedBook.prix ? `${selectedBook.prix.toFixed(2)} DH` : '-'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Date d'achat</span>
                  <span className="text-slate-200 font-medium">{selectedBook.date_achat || '-'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-500 block text-[10px]">Lieu d'achat</span>
                  <span className="text-slate-200 font-medium truncate block">{selectedBook.lieu_achat || '-'}</span>
                </div>
              </div>

              {/* --- HISTORIQUE DES LECTURES & RELECTURES --- */}
              <div className="pt-4 border-t border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-400" />
                    Lectures & Relectures ({Array.isArray(selectedBook.avis) ? selectedBook.avis.length : 0})
                  </h4>

                  {!showAvisForm && (
                    <button
                      onClick={openNewAvisForm}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter une lecture
                    </button>
                  )}
                </div>

                {/* Formulaire d'ajout / édition d'une relecture */}
                {showAvisForm && (
                  <form onSubmit={handleSaveAvis} className="bg-slate-900 p-4 rounded-xl border border-indigo-500/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300">
                        {editingAvisId ? 'Modifier la lecture' : 'Nouvelle session de lecture'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAvisForm(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Note pour cette lecture</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setFormAvis({ ...formAvis, note: star })}
                            className="p-0.5 text-slate-500 hover:text-amber-400 transition"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= formAvis.note
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-amber-400">{formAvis.note} / 5</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">Date début</label>
                        <input
                          type="date"
                          value={formAvis.date_lecture}
                          onChange={(e) => setFormAvis({ ...formAvis, date_lecture: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">Date fin</label>
                        <input
                          type="date"
                          value={formAvis.date_fin_lecture}
                          onChange={(e) => setFormAvis({ ...formAvis, date_fin_lecture: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Mon ressenti / Évolution de ma vision</label>
                      <textarea
                        rows="3"
                        required
                        placeholder="Ce que j'ai ressenti ou redécouvert lors de cette lecture..."
                        value={formAvis.commentaire}
                        onChange={(e) => setFormAvis({ ...formAvis, commentaire: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAvisForm(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                )}

                {/* Liste des avis */}
                {(!Array.isArray(selectedBook.avis) || selectedBook.avis.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-900/30 rounded-xl border border-slate-800">
                    Aucune session de lecture enregistrée pour ce livre.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedBook.avis.map((avisItem, index) => {
                      const sessionNumber = selectedBook.avis.length - index;
                      return (
                        <div
                          key={avisItem.id_avis || index}
                          className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2 text-xs relative group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-semibold text-[10px]">
                                {sessionNumber === 1 ? '1ère lecture' : `${sessionNumber}e relecture`}
                              </span>

                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= (avisItem.note || 0)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-600'
                                    }`}
                                  />
                                ))}
                                <span className="ml-1 font-bold text-amber-400">{avisItem.note}/5</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEditAvisForm(avisItem)}
                                className="text-slate-400 hover:text-amber-400 p-1"
                                title="Modifier cette lecture"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAvis(avisItem.id_avis)}
                                className="text-slate-400 hover:text-rose-400 p-1"
                                title="Supprimer cette lecture"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {(avisItem.date_lecture || avisItem.date_fin_lecture) && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                {avisItem.date_lecture && `Du ${avisItem.date_lecture}`}
                                {avisItem.date_fin_lecture && ` au ${avisItem.date_fin_lecture}`}
                              </span>
                            </div>
                          )}

                          {avisItem.commentaire && (
                            <div className="pt-1.5 text-slate-300 italic flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                              <p className="leading-relaxed font-serif">« {avisItem.commentaire} »</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bouton Retour en Haut */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl active:scale-90 transition"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}