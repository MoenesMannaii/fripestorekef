// components/Aide.tsx
"use client"
import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Logo from "../../assets/whatsapp_qr_code.png"

const Aide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const formRef = useRef<HTMLFormElement>(null);

  const faqs = [
    {
      question: "Comment créer un compte ?",
      answer: "Pour créer un compte, veuillez contacter le manager qui vous assistera dans le processus d'inscription.",
      category: "compte"
    },
    {
      question: "J'ai oublié mon mot de passe",
      answer: "Le manager, qui dispose de l'autorisation nécessaire, peut vous aider avec cette opération.",
      category: "compte"
    },
    {
      question: "Comment contacter le support ?",
      answer: "Vous pouvez nous contacter via le formulaire de contact disponible dans cette section ou par WhatsApp en scannant le code QR.",
      category: "support"
    },
    {
      question: "Problèmes d'accès à une page",
      answer: "Si vous rencontrez des erreurs d'accès, vérifiez vos permissions ou contactez votre administrateur système.",
      category: "technique"
    },
    {
      question: "Comment mettre à jour mes informations ?",
      answer: "Allez dans votre profil et cliquez sur 'Paramètres' puis 'Modifier le profile'. N'oubliez pas de sauvegarder vos modifications.",
      category: "compte"
    },
    {
      question: "Problème avec le terminal de caisse",
      answer: "Assurez-vous que le terminal est correctement connecté et allumé. Si le problème persiste, redémarrez le système POS et vérifiez la connexion réseau.",
      category: "pos"
    }
  ];

  const categories = [
    { id: 'all', name: 'Toutes les catégories' },
    { id: 'compte', name: 'Compte' },
    { id: 'support', name: 'Support' },
    { id: 'technique', name: 'Technique' },
    { id: 'pos', name: 'Terminal POS' }
  ];

  const contactMethods = [
    {
      title: "Email",
      description: "afekplus@gmail.com",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Téléphone",
      description: "+216 93 299 123",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    }
  ];

  // Filtrer les FAQs basé sur la recherche et la catégorie
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setStatusMessage('');

    if (!formRef.current) {
      setSubmitStatus('error');
      setStatusMessage('Erreur de formulaire. Veuillez réessayer.');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(formRef.current);
      
      const response = await fetch("https://formsubmit.co/ajax/afekplus@gmail.com", {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          message: formData.get('message'),
          _subject: "Nouveau message de contact - Centre d'Aide",
          _captcha: "false",
          _template: "table"
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setStatusMessage('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
        formRef.current.reset();
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSubmitStatus('error');
      setStatusMessage('Une erreur est survenue. Veuillez réessayer ou nous contacter par téléphone/WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête compact */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">Centre d'Aide</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Trouvez des réponses à vos questions ou contactez notre équipe de support.
          </p>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher une question..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none text-gray-900 placeholder-gray-500"
                />
                <div className="absolute right-3 top-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              {filteredFaqs.length} résultat(s) trouvé(s)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Sidebar Contact */}
          <div className="xl:col-span-1 space-y-6">
            {/* Méthodes de contact */}
            <div className="bg-white border border-gray-300 p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Rapide</h3>
              <div className="space-y-4">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-700">
                      {method.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{method.title}</p>
                      <p className="text-gray-600 text-sm">{method.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code WhatsApp */}
            <div className="bg-white border border-gray-300 p-5">
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.444"/>
                  </svg>
                  <h4 className="font-medium text-gray-900 text-sm">WhatsApp</h4>
                </div>
                <div className="bg-white p-3 border border-gray-300 inline-block">
                  <Image 
                    src={Logo} 
                    alt="QR Code WhatsApp"
                    width={140}
                    height={140}
                    className="max-w-full"
                    priority
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Scan for quick support
                </p>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FAQ Section */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-300 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium text-gray-900">
                      Questions Fréquentes
                    </h2>
                    <span className="text-sm text-gray-600">
                      {filteredFaqs.length} question(s)
                    </span>
                  </div>
                  
                  {filteredFaqs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredFaqs.map((faq, index) => (
                        <div key={index} className="border border-gray-300 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900 text-sm leading-tight">
                              {faq.question}
                            </h3>
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 ml-2 flex-shrink-0">
                              {faq.category}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-600">Aucun résultat trouvé</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulaire de contact */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-300 p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">Formulaire de Contact</h2>
                  
                  <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(submitStatus && statusMessage) && (
                      <div className={`md:col-span-2 p-4 ${
                        submitStatus === 'success' 
                          ? 'bg-green-50 border border-green-200 text-green-800' 
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        <p className="text-sm">{statusMessage}</p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        minLength={2}
                        className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        required
                        minLength={10}
                        className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900"
                        disabled={isSubmitting}
                      ></textarea>
                    </div>
                    
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gray-700 text-white py-3 px-4 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500  disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center">
                            <svg className=" -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Envoi en cours...
                          </span>
                        ) : (
                          'Envoyer le message'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Section urgence */}
            <div className="mt-6 bg-gray-100 border border-gray-300 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900">Support d'urgence</h3>
                  <p className="text-gray-700 text-sm">
                    Pour les problèmes urgents : <strong>+216 93 299 123</strong> (24h/24)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aide;
