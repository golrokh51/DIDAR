/* DIDAR public directory: audience-aware filters for university and community resources. */
(() => {
  'use strict';
  const here = document.currentScript;
  const root = new URL('../', here ? here.src : document.baseURI).href;
  const language = ['en', 'fr', 'fa'].includes(document.documentElement.lang) ? document.documentElement.lang : 'fr';
  const CSV = window.DIDARPublicCSV;
  const main = document.getElementById('resource-directory');
  if (!main) return;
  const text = {
    fr: {
      newcomers: 'Personnes nouvellement arrivées', students: 'Étudiant·es internationaux·ales',
      all: 'Toutes les catégories', allUniversities: 'Toutes les universités', search: 'Rechercher une ressource',
      university: 'Université', category: 'Type de service', claimant: 'Admissibilité des personnes demandant l’asile',
      claimantAll: 'Toutes les situations', claimantYes: 'Service indiqué comme accessible',
      claimantConditional: 'Sous conditions', claimantUnknown: 'À confirmer',
      results: n => `${n} ressource${n === 1 ? '' : 's'}`, reset: 'Réinitialiser les filtres',
      universityType: 'Service universitaire', communityType: 'Organisme ou ressource communautaire',
      link: 'Consulter le site officiel', source: 'Source de référence', telephone: 'Téléphone',
      eligibleStudents: 'Accès des étudiants internationaux', eligibleClaimants: 'Accès des demandeurs d’asile',
      yes: 'Indiqué comme accessible', no: 'Indiqué comme non admissible', conditional: 'Selon conditions', unknown: 'À confirmer',
      details: 'Conditions et notes de la fiche (en français)', noResults: 'Aucune ressource ne correspond aux filtres.',
      loadError: 'Le répertoire est temporairement indisponible. Veuillez réessayer plus tard.',
      warning: 'Les conditions d’accès varient selon le statut migratoire, le programme et la situation personnelle. Vérifiez directement auprès de l’organisme avant de vous déplacer.',
      working: 'Fiche issue du répertoire de travail DIDAR (novembre 2026) — informations à reconfirmer.',
      universityNote: 'Point d’entrée officiel; les services spécifiques et l’admissibilité doivent être confirmés.',
      clear: 'Effacer la recherche', organization: 'Organisme', offCampus: 'Hors campus', campus: 'Université',
      relevance: 'Les organismes communautaires sont indépendants de votre université.',
    },
    en: {
      newcomers: 'Newcomers', students: 'International students', all: 'All service types',
      allUniversities: 'All universities', search: 'Search resources', university: 'University', category: 'Type of support',
      claimant: 'Asylum seeker eligibility', claimantAll: 'All eligibility statuses',
      claimantYes: 'Listed as accessible', claimantConditional: 'Conditions apply', claimantUnknown: 'To be confirmed',
      results: n => `${n} resource${n === 1 ? '' : 's'}`, reset: 'Reset filters',
      universityType: 'University service', communityType: 'Community organization or resource',
      link: 'Visit official website', source: 'Supporting source', telephone: 'Phone',
      eligibleStudents: 'International student eligibility', eligibleClaimants: 'Asylum seeker eligibility',
      yes: 'Listed as accessible', no: 'Listed as not eligible', conditional: 'Conditions apply', unknown: 'Not yet confirmed',
      details: 'Eligibility and service notes (original French)', noResults: 'No resources match these filters.',
      loadError: 'The directory is temporarily unavailable. Please try again later.',
      warning: 'Eligibility depends on immigration status, program rules and personal circumstances. Confirm with the organization before visiting.',
      working: 'From DIDAR’s working resource list (November 2026) — details require reconfirmation.',
      universityNote: 'Official entry point; specific services and eligibility must be confirmed.',
      clear: 'Clear search', organization: 'Organization', offCampus: 'Off-campus', campus: 'University',
      relevance: 'Community organizations are independent from the selected university.',
    },
    fa: {
      newcomers: 'تازه‌واردان', students: 'دانشجویان بین‌المللی', all: 'همهٔ زمینه‌های خدمات',
      allUniversities: 'همهٔ دانشگاه‌ها', search: 'جست‌وجوی منابع', university: 'دانشگاه', category: 'نوع خدمات',
      claimant: 'شرایط استفادهٔ پناهجویان', claimantAll: 'همهٔ وضعیت‌ها', claimantYes: 'امکان استفاده ذکر شده',
      claimantConditional: 'دارای شرایط', claimantUnknown: 'نیازمند بررسی',
      results: n => `${n} منبع`, reset: 'پاک‌کردن فیلترها',
      universityType: 'خدمات دانشگاهی', communityType: 'سازمان یا منبع اجتماعی',
      link: 'وب‌سایت رسمی', source: 'منبع اطلاعات', telephone: 'تلفن',
      eligibleStudents: 'شرایط دانشجویان بین‌المللی', eligibleClaimants: 'شرایط پناهجویان',
      yes: 'امکان استفاده ذکر شده', no: 'عدم واجد شرایط بودن ذکر شده', conditional: 'با شرایط خاص', unknown: 'نیازمند بررسی',
      details: 'شرایط و توضیحات پرونده (متن اصلی فرانسوی)', noResults: 'منبعی با این فیلترها پیدا نشد.',
      loadError: 'فهرست منابع موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.',
      warning: 'شرایط استفاده به وضعیت مهاجرتی، برنامه و شرایط شخصی بستگی دارد. پیش از مراجعه مستقیماً با سازمان مربوطه تماس بگیرید.',
      working: 'برگرفته از فهرست کاری دیدار (نوامبر ۲۰۲۶)؛ اطلاعات نیازمند بازبینی است.',
      universityNote: 'درگاه رسمی دانشگاه؛ خدمات و شرایط استفاده باید بررسی شوند.',
      clear: 'پاک‌کردن جست‌وجو', organization: 'سازمان', offCampus: 'خارج از دانشگاه', campus: 'دانشگاه',
      relevance: 'سازمان‌های اجتماعی مستقل از دانشگاه انتخاب‌شده هستند.',
    }
  }[language];
  const categories = {
    settlement: ['Accueil et intégration', 'Settlement & integration', 'پذیرش و سازگاری'],
    immigration: ['Immigration et asile', 'Immigration & asylum', 'مهاجرت و پناهندگی'],
    legal: ['Aide juridique et droits', 'Legal help & rights', 'کمک حقوقی و حقوق فردی'],
    housing: ['Logement et besoins essentiels', 'Housing & essential needs', 'مسکن و نیازهای ضروری'],
    financial: ['Financement et bourses', 'Financial aid & scholarships', 'کمک مالی و بورسیه'],
    health: ['Santé et soutien psychosocial', 'Health & psychosocial support', 'سلامت و حمایت روانی'],
    safety: ['Sécurité et violences', 'Safety & violence support', 'امنیت و حمایت در برابر خشونت'],
    academic: ['Réussite et vie universitaires', 'University & academic support', 'پشتیبانی تحصیلی و دانشگاهی'],
    language: ['Francisation et langues', 'French and language learning', 'آموزش فرانسه و زبان'],
    employment: ['Emploi et formation', 'Employment & training', 'اشتغال و آموزش حرفه‌ای'],
    community: ['Communauté et inclusion', 'Community & inclusion', 'جامعه و مشارکت'],
    women: ['Centres de femmes', "Women's centres", 'مراکز زنان'],
    lgbtq: ['Ressources LGBTQIA+', 'LGBTQIA+ resources', 'منابع ویژهٔ LGBTQIA+'],
    digital: ['Soutien numérique', 'Digital support', 'پشتیبانی دیجیتال'],
  };
  const catIndex = {fr:0,en:1,fa:2}[language];
  const $ = s => document.querySelector(s);
  const make = (tag, cls, str) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (str !== undefined) n.textContent = str;
    return n;
  };
  const validUrl = str => CSV && CSV.https ? CSV.https(str) : '';
  const params = new URLSearchParams(location.search);
  const state = {
    audience: params.get('audience') === 'students' ? 'students' : 'newcomers',
    university: params.get('university') || '',
    category: params.get('category') || '',
    claimant: params.get('claimant') || '',
    search: params.get('q') || '',
  };
  let records = [];
  const audienceBtns = [...document.querySelectorAll('[data-resource-audience]')];
  const universitySelect = $('#rd-university');
  const universityWrap = $('#rd-university-wrap');
  const categorySelect = $('#rd-category');
  const claimantSelect = $('#rd-claimant');
  const claimantWrap = $('#rd-claimant-wrap');
  const searchInput = $('#rd-search');
  const resetBtn = $('#rd-reset');
  const count = $('#rd-count');
  const results = $('#rd-results');
  const notice = $('#rd-notice');
  const langValue = (r, stem) => r[`${stem}_${language}`] || r[`${stem}_fr`] || r[`${stem}_en`] || r.name || '';
  const categoryIds = r => (r.categories || '').split('|').map(s => s.trim()).filter(Boolean);
  const isStudentEligible = r => r.student_eligibility !== 'no';
  const labelEligibility = code => text[['yes','no','conditional','unknown'].includes(code) ? code : 'unknown'];

  function setup() {
    Object.keys(categories).forEach(id => {
      const opt = make('option', '', categories[id][catIndex]); opt.value = id; categorySelect.append(opt);
    });
    [...new Set(records.filter(r => r.organization_type === 'university').map(r => r.university).filter(Boolean))].sort().forEach(name => {
      const opt = make('option', '', name); opt.value = name; universitySelect.append(opt);
    });
    if (![...categorySelect.options].some(x => x.value === state.category)) state.category = '';
    if (![...universitySelect.options].some(x => x.value === state.university)) state.university = '';
    if (!['','yes','conditional','unknown'].includes(state.claimant)) state.claimant = '';
    categorySelect.value = state.category;
    universitySelect.value = state.university;
    claimantSelect.value = state.claimant;
    searchInput.value = state.search;
    for(const button of audienceBtns) button.addEventListener('click', () => {
      state.audience = button.dataset.resourceAudience;
      if (state.audience === 'newcomers') state.university = '';
      else state.claimant = '';
      draw();
    });
    categorySelect.addEventListener('change', () => {state.category = categorySelect.value;draw();});
    universitySelect.addEventListener('change', () => {state.university = universitySelect.value;draw();});
    claimantSelect.addEventListener('change', () => {state.claimant = claimantSelect.value;draw();});
    searchInput.addEventListener('input', () => {state.search = searchInput.value.trim();draw();});
    resetBtn.addEventListener('click', () => {
      state.university = '';state.category = '';state.claimant = '';state.search = '';
      universitySelect.value = '';categorySelect.value = '';claimantSelect.value = '';searchInput.value = '';
      draw();
    });
  }
  function filtered() {
    const q = state.search.trim().toLocaleLowerCase();
    return records.filter(r => {
      if (r.published.toLowerCase() !== 'yes') return false;
      if (state.audience === 'newcomers') {
        if (r.organization_type !== 'community') return false;
        if (state.claimant && r.asylum_eligibility !== state.claimant) return false;
      } else {
        if (r.organization_type === 'community' && !isStudentEligible(r)) return false;
        if (r.organization_type === 'university' && state.university && r.university !== state.university) return false;
      }
      if (state.category && !categoryIds(r).includes(state.category)) return false;
      if(q && ![r.name, r.university, r.name_fr, r.name_en, r.name_fa,
        r.description_fr,r.description_en,r.description_fa,r.original_category_fr,r.source_note_fr]
        .join(' ').toLocaleLowerCase().includes(q)) return false;
      return true;
    }).sort((a,b) => {
      if (state.audience === 'students' && a.organization_type !== b.organization_type)
        return a.organization_type === 'university' ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''), language);
    });
  }
  function badge(cls, value) {return make('span', 'rd-badge ' + cls, value);}
  function card(r) {
    const article=make('article','rd-card');
    const head=make('div','rd-card-head');
    head.append(badge('rd-badge-type',r.organization_type==='university' ? text.universityType : text.communityType));
    if(r.university)head.append(badge('rd-badge-university',r.university));
    article.append(head);
    const h=make('h3','rd-card-title',langValue(r,'name')); h.dir='auto';article.append(h);
    const description=make('p','rd-card-desc',langValue(r,'description'));description.dir='auto';article.append(description);
    const chips=make('div','rd-chips');
    categoryIds(r).slice(0,3).forEach(id=>{if(categories[id])chips.append(badge('rd-badge-category',categories[id][catIndex]));});
    article.append(chips);
    if(r.organization_type==='community') {
      const elig=make('dl','rd-elig');
      const dt=make('dt','',text.eligibleStudents), dd=make('dd','',labelEligibility(r.student_eligibility));
      const dt2=make('dt','',text.eligibleClaimants), dd2=make('dd','',labelEligibility(r.asylum_eligibility));
      elig.append(dt,dd,dt2,dd2);article.append(elig);
    }
    const actions=make('div','rd-card-actions');
    const target=validUrl(r.website_url);
    if(target){const a=make('a','rd-visit',text.link);a.href=target;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
    if(r.contact){
      const phone=r.contact.trim();const strong=make('span','rd-contact',text.telephone+': ');
      const digits=phone.replace(/[^\d+]/g,'');
      if(/^\+?\d{8,15}$/.test(digits)){
        const a=make('a','',phone);a.href='tel:'+digits;strong.append(a);
      } else strong.append(document.createTextNode(phone));
      actions.append(strong);
    }
    article.append(actions);
    const note=make('p','rd-source-note',r.organization_type === 'community'?text.working:text.universityNote);
    article.append(note);
    const hasDetails=Boolean(r.original_eligibility_student_fr||r.original_eligibility_asylum_fr||r.cost_note_fr||r.source_note_fr);
    if(hasDetails){
      const details=make('details','rd-details');details.append(make('summary','',text.details));
      const ul=make('ul');
      for(const [label,val] of [[text.eligibleStudents,r.original_eligibility_student_fr],
        [text.eligibleClaimants,r.original_eligibility_asylum_fr],['Coût / admissibilité',r.cost_note_fr],['Services principaux',r.source_note_fr]]) {
        if(val){const li=make('li');li.append(make('strong','',label+': '),document.createTextNode(val));li.dir='auto';ul.append(li);}
      }
      details.append(ul);article.append(details);
    }
    if(validUrl(r.verification_url)&&r.verification_url!==r.website_url){
      const evidence=make('a','rd-evidence',text.source);evidence.href=validUrl(r.verification_url);evidence.target='_blank';evidence.rel='noopener noreferrer';article.append(evidence);
    }
    return article;
  }
  function draw() {
    const isStudents=state.audience==='students';
    for(const btn of audienceBtns) {
      const selected=btn.dataset.resourceAudience===state.audience;
      btn.setAttribute('aria-pressed',String(selected));
      btn.classList.toggle('is-selected',selected);
    }
    universityWrap.hidden=!isStudents;
    claimantWrap.hidden=isStudents;
    notice.textContent=(isStudents ? text.relevance + ' ' : '') + text.warning;
    const matched=filtered();
    count.textContent=text.results(matched.length);
    results.replaceChildren(...(matched.length ? matched.map(card) : [make('p','rd-empty',text.noResults)]));
    const params=new URLSearchParams();
    params.set('audience',state.audience);
    if(state.category)params.set('category',state.category);
    if(isStudents && state.university)params.set('university',state.university);
    if(!isStudents && state.claimant)params.set('claimant',state.claimant);
    if(state.search)params.set('q',state.search);
    history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash);
  }
  (async()=>{
    try {
      if(!CSV || !CSV.load)throw Error('Shared DIDAR CSV parser is unavailable');
      records=await CSV.load(root,'config/resource-directory-source.json','data/didar-resources.csv');
      setup();draw();
    } catch(e) {
      console.error('Resource directory unavailable',e);
      count.textContent=''; results.replaceChildren(make('p','rd-empty',text.loadError));
    }
  })();
})();
