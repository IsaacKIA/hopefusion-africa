/**
 * HopeFusion Africa — Internationalization (i18n)
 * Languages: English, French, Swahili, Hausa, Arabic
 * Library: i18next (browser + Node.js compatible)
 * Install: npm install i18next i18next-browser-languagedetector
 * CDN: <script src="https://cdn.jsdelivr.net/npm/i18next@23/dist/umd/i18next.min.js"></script>
 */

/* ============================================================
   TRANSLATION DICTIONARIES
   ============================================================ */

export const translations = {

  /* ── ENGLISH (base) ──────────────────────────────────────── */
  en: {
    common: {
      app_name:      'HopeFusion Africa',
      tagline:       'Empower. Innovate. Thrive.',
      loading:       'Loading…',
      save:          'Save',
      cancel:        'Cancel',
      submit:        'Submit',
      continue:      'Continue',
      back:          'Back',
      view_all:      'View all',
      search:        'Search',
      filter:        'Filter',
      apply:         'Apply',
      close:         'Close',
      done:          'Done',
      edit:          'Edit',
      delete:        'Delete',
      confirm:       'Confirm',
      success:       'Success',
      error:         'Error',
      required:      'Required',
      optional:      'Optional',
      days_left:     '{{count}} days left',
      just_now:      'Just now',
      ago:           '{{time}} ago',
    },
    nav: {
      dashboard:     'Dashboard',
      ai_matching:   'AI Matching',
      grants:        'Grants',
      elearning:     'E-Learning',
      mentorship:    'Mentorship',
      government:    'Govt. Support',
      marketplace:   'Marketplace',
      settings:      'Settings',
      sign_out:      'Sign out',
      sign_in:       'Sign in',
      get_started:   'Get started',
      how_it_works:  'How it works',
      platform:      'Platform',
      impact:        'Impact',
      sdgs:          'SDGs',
      about:         'About',
    },
    home: {
      hero_headline:   'Where African <span class="line-green">Innovation</span><br/>meets <span class="line-gold">Opportunity</span>',
      hero_sub:        'One unified platform connecting startups, investors, mentors, and resources across the continent. Empower. Innovate. Thrive.',
      hero_badge:      'Beta launch — 5,000 startups. $50M in impact funding.',
      eyebrow:         "Africa's #1 startup ecosystem",
      watch_story:     'Watch the story',
      launch_startup:  'Launch your startup',
      stat_startups:   'Startups in beta',
      stat_funding:    'Impact funding goal',
      stat_unemployment: 'Unemployment reduction by 2030',
      stat_market:     'African market opportunity',
      how_badge:       'How it works',
      how_title:       'From idea to impact in four steps',
      how_sub:         'A seamless journey designed for African entrepreneurs navigating real challenges on the ground.',
      step1_title:     'Register your startup',
      step1_desc:      'Create your profile, describe your vision and get verified in under 10 minutes.',
      step1_body:      'Build your startup profile with pitch details, team info, sector and funding needs. Our AI begins working immediately — analyzing your pitch and queuing smart matches before you even finish registration.',
      step2_title:     'Get matched by AI',
      step2_desc:      'Our engine connects you with the right investors, mentors and resources instantly.',
      step2_body:      'Our AI engine scans thousands of investors, mentors and resources to find your perfect match based on sector, stage, location and goals. You get precision-ranked recommendations, not random lists.',
      step3_title:     'Access funding',
      step3_desc:      'Apply to grants, VC, angel and crowdfunding from one unified dashboard.',
      step3_body:      'Apply to grants, VC funds, angel networks and crowdfunding from a single unified dashboard. Track applications, receive AI-generated feedback and manage term sheets — all in one place.',
      step4_title:     'Scale and thrive',
      step4_desc:      'Use our marketplace, e-learning and global partnerships to grow beyond borders.',
      step4_body:      'Access the integrated marketplace to sell products, enroll in founder courses, automate your back office and connect with global partners. Your growth beyond Africa starts here.',
      cta_headline:    "Africa's future is built by people like you.",
      cta_sub:         'Join thousands of entrepreneurs, investors and mentors already shaping the continent\'s next chapter.',
      cta_startup:     'Launch my startup',
      cta_investor:    "I'm an investor",
      ready_join:      'Ready to join the movement?',
    },
    auth: {
      login_title:     'Welcome back',
      login_sub:       'Sign in to your HopeFusion Africa account',
      register_title:  'Create your account',
      register_sub:    'Join Africa\'s premier startup ecosystem',
      email:           'Email address',
      password:        'Password',
      confirm_password:'Confirm password',
      first_name:      'First name',
      last_name:       'Last name',
      phone:           'Phone number',
      country:         'Country',
      role:            'I am a…',
      role_startup:    'Startup founder',
      role_investor:   'Investor',
      role_mentor:     'Mentor',
      forgot_password: 'Forgot password?',
      no_account:      "Don't have an account? {{link}}",
      have_account:    'Already have an account? {{link}}',
      or_continue:     'Or continue with',
      terms_agree:     'I agree to the {{terms}} and {{privacy}}',
      verify_title:    'Verify your email',
      verify_sub:      'Enter the 6-digit code sent to {{email}}',
      verify_resend:   'Resend code',
    },
    startup: {
      register_title:  'Launch your startup journey',
      register_sub:    'Join thousands of African entrepreneurs on HopeFusion.',
      step_founder:    'Founder details',
      step_profile:    'Startup profile',
      step_funding:    'Stage & funding',
      step_team:       'Team & links',
      step_review:     'Review & submit',
      startup_name:    'Startup name',
      tagline:         'One-line pitch',
      description:     'Full description',
      sector:          'Industry sector',
      stage:           'Current stage',
      funding_needed:  'Funding needed',
      funding_type:    'Funding type preferred',
      success_title:   "You're on HopeFusion!",
      success_sub:     'Your startup profile is live. Our AI is scanning for matches.',
    },
    matching: {
      title:           'AI Matching Engine',
      sub:             'Powered by HopeFusion intelligence',
      scan_running:    'AI scan running…',
      scan_sub:        'Analysing {{count}} startup profiles against your investment thesis.',
      matches_found:   '{{count}} matches found',
      match_score:     '{{score}}% match',
      why_matched:     'Why matched',
      invest:          'Invest',
      schedule:        'Schedule call',
      save_match:      'Save',
      saved:           'Saved',
      run_scan:        'Run AI match now',
      re_run:          'Re-run scan',
      no_matches:      'No matches yet. Update your profile to improve results.',
    },
    grants: {
      title:           'Grant Platform',
      sub:             'Discover and apply for grants matched to your startup',
      available:       '${{amount}} available',
      active_grants:   '{{count}} active grants',
      closing_soon:    'Closing this week',
      deadline:        'Deadline',
      amount:          'Amount',
      apply_now:       'Apply now',
      save_grant:      'Save grant',
      eligibility:     'You qualify',
      partial:         'Partial match',
      not_eligible:    'Not eligible',
      my_applications: 'My applications',
      awarded:         'Awarded',
      under_review:    'Under review',
      shortlisted:     'Shortlisted',
      submitted:       'Submitted',
    },
    dashboard: {
      welcome:         'Good {{time}}, {{name}} 👋',
      new_matches:     'You have {{count}} new AI-matched startups',
      unread_messages: '{{count}} unread messages',
      total_deployed:  'Total deployed capital',
      portfolio_count: 'Portfolio startups',
      new_matches_count: 'New AI matches',
      avg_roi:         'Avg portfolio ROI',
    },
    errors: {
      required_field:   'This field is required',
      invalid_email:    'Please enter a valid email address',
      password_short:   'Password must be at least 8 characters',
      passwords_no_match: 'Passwords do not match',
      generic:          'Something went wrong. Please try again.',
      network:          'Network error. Check your connection.',
      session_expired:  'Your session has expired. Please sign in again.',
    },
  },

  /* ── FRENCH ──────────────────────────────────────────────── */
  fr: {
    common: {
      app_name:      'HopeFusion Afrique',
      tagline:       'Autonomiser. Innover. Prospérer.',
      loading:       'Chargement…',
      save:          'Enregistrer',
      cancel:        'Annuler',
      submit:        'Soumettre',
      continue:      'Continuer',
      back:          'Retour',
      view_all:      'Voir tout',
      search:        'Rechercher',
      filter:        'Filtrer',
      apply:         'Appliquer',
      close:         'Fermer',
      done:          'Terminé',
      edit:          'Modifier',
      delete:        'Supprimer',
      confirm:       'Confirmer',
      success:       'Succès',
      error:         'Erreur',
      required:      'Obligatoire',
      optional:      'Optionnel',
      days_left:     '{{count}} jours restants',
      just_now:      "À l'instant",
      ago:           'Il y a {{time}}',
    },
    nav: {
      dashboard:     'Tableau de bord',
      ai_matching:   'Correspondances IA',
      grants:        'Subventions',
      elearning:     'E-Formation',
      mentorship:    'Mentorat',
      government:    'Soutien gouvernemental',
      marketplace:   'Marché',
      settings:      'Paramètres',
      sign_out:      'Se déconnecter',
      sign_in:       'Se connecter',
      get_started:   'Commencer',
      how_it_works:  'Comment ça marche',
      platform:      'Plateforme',
      impact:        'Impact',
      sdgs:          'ODDs',
      about:         'À propos',
    },
    home: {
      hero_headline:   'Là où l\'<span class="line-green">innovation</span> africaine<br/>rencontre l\'<span class="line-gold">opportunité</span>',
      hero_sub:        'Une plateforme unifiée connectant startups, investisseurs, mentors et ressources à travers le continent. Autonomiser. Innover. Prospérer.',
      hero_badge:      'Lancement bêta — 5 000 startups. 50M$ de financement impact.',
      eyebrow:         "L'écosystème startup #1 en Afrique",
      watch_story:     "Regarder l'histoire",
      launch_startup:  'Lancer votre startup',
      stat_startups:   'Startups en bêta',
      stat_funding:    'Objectif de financement',
      stat_unemployment: "Réduction du chômage d'ici 2030",
      stat_market:     "Opportunité de marché africaine",
      how_badge:       'Comment ça marche',
      how_title:       "De l'idée à l'impact en quatre étapes",
      how_sub:         "Un parcours fluide conçu pour les entrepreneurs africains confrontés à des défis réels sur le terrain.",
      step1_title:     'Inscrivez votre startup',
      step1_desc:      'Créez votre profil, décrivez votre vision et soyez vérifié en moins de 10 minutes.',
      step1_body:      'Créez votre profil de startup avec pitch, équipe, secteur et besoins de financement. Notre IA commence immédiatement à analyser et préparer des correspondances.',
      step2_title:     "Mise en relation par l'IA",
      step2_desc:      'Notre moteur vous connecte instantanément avec les bons investisseurs, mentors et ressources.',
      step2_body:      'Notre moteur IA scanne des milliers d\'investisseurs et mentors pour trouver la correspondance parfaite selon votre secteur, stade, localisation et objectifs.',
      step3_title:     'Accès aux financements',
      step3_desc:      'Postulez aux subventions, capital-risque et financement participatif depuis un tableau de bord unique.',
      step3_body:      'Postulez aux subventions et capital-risque à partir d\'un tableau de bord unique. Suivez vos demandes et gérez vos term-sheets.',
      step4_title:     'Évoluer et prospérer',
      step4_desc:      'Utilisez notre marché, formation en ligne et partenariats mondiaux pour croître au-delà des frontières.',
      step4_body:      'Accédez au marché intégré pour vendre vos produits, suivre des formations de niveau mondial et automatiser votre back-office.',
      cta_headline:    "L'avenir de l'Afrique est construit par des gens comme vous.",
      cta_sub:         "Rejoignez des milliers d'entrepreneurs, d'investisseurs et de mentors façonnant déjà le prochain chapitre du continent.",
      cta_startup:     'Lancer ma startup',
      cta_investor:    'Je suis investisseur',
      ready_join:      'Prêt à rejoindre le mouvement ?',
    },
    auth: {
      login_title:     'Bon retour',
      login_sub:       'Connectez-vous à votre compte HopeFusion Afrique',
      register_title:  'Créez votre compte',
      register_sub:    "Rejoignez l'écosystème de startups d'Afrique",
      email:           'Adresse email',
      password:        'Mot de passe',
      confirm_password:'Confirmer le mot de passe',
      first_name:      'Prénom',
      last_name:       'Nom',
      phone:           'Numéro de téléphone',
      country:         'Pays',
      role:            'Je suis…',
      role_startup:    'Fondateur de startup',
      role_investor:   'Investisseur',
      role_mentor:     'Mentor',
      forgot_password: 'Mot de passe oublié ?',
      no_account:      "Vous n'avez pas de compte ? {{link}}",
      have_account:    'Vous avez déjà un compte ? {{link}}',
      verify_title:    'Vérifiez votre email',
      verify_sub:      'Entrez le code à 6 chiffres envoyé à {{email}}',
    },
    errors: {
      required_field:   'Ce champ est obligatoire',
      invalid_email:    'Veuillez entrer une adresse email valide',
      password_short:   'Le mot de passe doit comporter au moins 8 caractères',
      generic:          "Quelque chose s'est mal passé. Veuillez réessayer.",
      network:          'Erreur réseau. Vérifiez votre connexion.',
      session_expired:  'Votre session a expiré. Veuillez vous reconnecter.',
    },
  },

  /* ── SWAHILI ─────────────────────────────────────────────── */
  sw: {
    common: {
      app_name:      'HopeFusion Afrika',
      tagline:       'Wezesha. Uvumbuzi. Stawi.',
      loading:       'Inapakia…',
      save:          'Hifadhi',
      cancel:        'Ghairi',
      submit:        'Wasilisha',
      continue:      'Endelea',
      back:          'Rudi',
      view_all:      'Ona yote',
      search:        'Tafuta',
      apply:         'Omba',
      close:         'Funga',
      done:          'Imekamilika',
      required:      'Inahitajika',
      days_left:     'Siku {{count}} zimebaki',
      just_now:      'Sasa hivi',
    },
    nav: {
      dashboard:     'Dashibodi',
      ai_matching:   'Uoanishaji wa AI',
      grants:        'Ruzuku',
      elearning:     'Mafunzo ya Mtandaoni',
      mentorship:    'Ufundishaji',
      government:    'Msaada wa Serikali',
      marketplace:   'Soko',
      settings:      'Mipangilio',
      sign_out:      'Toka',
      sign_in:       'Ingia',
      get_started:   'Anza',
      how_it_works:  'Jinsi inavyofanya kazi',
      platform:      'Jukwaa',
      impact:        'Athari',
      sdgs:          'SDGs',
      about:         'Kuhusu',
    },
    home: {
      hero_headline:   'Mahali ambapo <span class="line-green">uvumbuzi</span> wa Afrika<br/>unakutana na <span class="line-gold">fursa</span>',
      hero_sub:        'Jukwaa moja linalounganisha startups, wawekezaji, washauri na rasilimali barani. Wezesha. Uvumbuzi. Stawi.',
      hero_badge:      'Uzinduzi wa beta — Startups 5,000. Fedha za athari $50M.',
      eyebrow:         "Ecosystem ya #1 ya startup barani Afrika",
      watch_story:     'Tazama hadithi',
      launch_startup:  'Zindua startup yako',
      stat_startups:   'Startups katika beta',
      stat_funding:    'Lengo la ufadhili wa athari',
      stat_unemployment: 'Kupunguza ukosefu wa ajira ifikapo 2030',
      stat_market:     'Fursa ya soko la Afrika',
      how_badge:       'Jinsi inavyofanya kazi',
      how_title:       'Kutoka wazo hadi athari katika hatua nne',
      how_sub:         'Safari isiyo na imla iliyoundwa kwa wajasiriamali wa Kiafrika wanaokabiliana na changamoto halisi ardhini.',
      step1_title:     'Sajili startup yako',
      step1_desc:      'Unda wasifu wako, eleza maono yako na uthibitishwe chini ya dakika 10.',
      step1_body:      'Jenga wasifu wako wa startup na pitch, timu, sekta na mahitaji ya fedha. AI yetu inaanza kufanya kazi mara moja.',
      step2_title:     'Oanishwa na AI',
      step2_desc:      'Injini yetu inakuunganisha na wawekezaji, washauri na rasilimali sahihi mara moja.',
      step2_body:      'Injini yetu ya AI inatafuta maelfu ya wawekezaji ili kupata oanisho kamili kulingana na sekta, stage na malengo.',
      step3_title:     'Pata ufadhili',
      step3_desc:      'Omba ruzuku, VC na crowdfunding kutoka dashibodi moja ya umoja.',
      step3_body:      'Omba ruzuku, mifuko ya VC na mitandao ya angel kutoka dashibodi moja. Fuatilia maombi yako yote.',
      step4_title:     'Kua na ustawi',
      step4_desc:      'Tumia soko letu, mafunzo ya mtandaoni na ushirikiano wa kimataifa kukua nje ya mipaka.',
      step4_body:      'Fikia soko lililounganishwa kuuza bidhaa, jiunge na kozi za waanzilishi na uendeshe back-office yako.',
      cta_headline:    'Mustakabali wa Afrika umejengwa na watu kama wewe.',
      cta_sub:         'Jiunge na maelfu ya wajasiriamali, wawekezaji na washauri tayari wanaounda sura inayofuata ya bara.',
      cta_startup:     'Zindua startup amayo',
      cta_investor:    'Mimi ni mwekezaji',
      ready_join:      'Uko tayari kujiunga na harakati?',
    },
    auth: {
      login_title:     'Karibu tena',
      register_title:  'Unda akaunti yako',
      email:           'Anwani ya barua pepe',
      password:        'Nenosiri',
      first_name:      'Jina la kwanza',
      last_name:       'Jina la familia',
      country:         'Nchi',
      role:            'Mimi ni…',
      role_startup:    'Mwanzilishi wa startup',
      role_investor:   'Mwekezaji',
      role_mentor:     'Mshauri',
    },
    errors: {
      required_field:  'Uwanja huu unahitajika',
      invalid_email:   'Tafadhali weka anwani sahihi ya barua pepe',
      generic:         'Kitu kilienda vibaya. Tafadhali jaribu tena.',
    },
  },

  /* ── HAUSA ───────────────────────────────────────────────── */
  ha: {
    common: {
      app_name:      'HopeFusion Afirka',
      tagline:       'Karfafawa. Kirkira. Bunƙasa.',
      loading:       'Ana lodi…',
      save:          'Ajiye',
      cancel:        'Soke',
      submit:        'Aika',
      continue:      'Ci gaba',
      back:          'Koma',
      search:        'Nema',
      apply:         'Nema',
      close:         'Rufe',
      done:          'An gama',
      required:      'Ana bukata',
    },
    nav: {
      dashboard:     'Allon sarrafawa',
      ai_matching:   'Daidaituwar AI',
      grants:        'Tallafin kudi',
      elearning:     'Koyo ta Intanet',
      mentorship:    'Jagoranci',
      government:    'Taimakon Gwamnati',
      sign_out:      'Fita',
      sign_in:       'Shiga',
      get_started:   'Fara',
      how_it_works:  'Yadda yake aiki',
      platform:      'Dandali',
      impact:        'Tasiri',
      sdgs:          'SDGs',
      about:         'Game da mu',
    },
    home: {
      hero_headline:   'Inda <span class="line-green">kirkira</span> ta Afirka<br/>ta haɗu da <span class="line-gold">dama</span>',
      hero_sub:        'Dandali guda ɗaya da ke haɗa kamfanonin farawa, masu zuba jari, masu ba da shawara da albarkatu a fadin nahiyar. Karfafawa. Kirkira. Bunƙasa.',
      hero_badge:      'Kaddamar da beta — startups 5,000. Tallafin tasiri $50M.',
      eyebrow:         "Ecosystem na startup #1 a Afirka",
      watch_story:     'Kalli tarihin',
      launch_startup:  'Fara kamfanin ku',
      stat_startups:   'Startups a cikin beta',
      stat_funding:    'Manufar tallafin tasiri',
      stat_unemployment: 'Rage rashin aikin yi nan da 2030',
      stat_market:     'Damar kasuwar Afirka',
      how_badge:       'Yadda yake aiki',
      how_title:       'Daga ra\'ayi zuwa tasiri a matakai hudu',
      how_sub:         'Tafiya marar matsala da aka tsara don \'yan kasuwa na Afirka da ke fuskantar kalubale na gaske a kasa.',
      step1_title:     'Yi rajistar kamfanin ku',
      step1_desc:      'Ƙirƙiri bayanan ku, bayyana hangen nesanku kuma a tabbatar da ku a ƙasa da mintuna 10.',
      step1_body:      'Gina bayanan farawar ku tare da pitch, bayanan kungiya da bukatun kudi. AI dinmu yana fara aiki nan da nan.',
      step2_title:     'Daidaita ta AI',
      step2_desc:      'Injin dinmu yana haɗa ku da masu zuba jari, masu ba da shawara da albarkatu daidai nan da nan.',
      step2_body:      'Injin dinmu na AI yana bincika dubban masu zuba jari don nemo daidaitaccen tsari dangane da fanni, mataki da manufofi.',
      step3_title:     'Samun tallafi',
      step3_desc:      'Nemi tallafi, VC da crowdfunding daga allon sarrafawa guda daya.',
      step3_body:      'Nemi tallafi, asusun VC da hanyoyin sadarwa na angel daga babban allon sarrafawa guda daya.',
      step4_title:     'Bunkasa da bunkasa',
      step4_desc:      'Yi amfani da kasuwarmu, koyo ta intanet da haɗin gwiwar duniya don haɓaka fiye da kan iyaka.',
      step4_body:      'Shiga cikin hadadden kasuwa don siyar da samfuran, shiga cikin kwasa-kwasan wanda ya kafa.',
      cta_headline:    'An gina makomar Afirka ta mutane kamarka.',
      cta_sub:         'Shiga cikin dubban \'yan kasuwa, masu zuba jari da masu ba da shawara da suka riga sun tsara babi na gaba na nahiyar.',
      cta_startup:     'Fara kamfanina',
      cta_investor:    'Ni mai zuba jari ne',
      ready_join:      'Shirya don shiga harkar?',
    },
    auth: {
      login_title:     'Barka da dawowa',
      register_title:  'Ƙirƙiri asusu',
      email:           'Adireshin imel',
      password:        'Kalmar sirri',
      first_name:      'Suna na farko',
      last_name:       'Suna na ƙarshe',
      country:         'Ƙasa',
      role_startup:    'Wanda ya kafa kamfanin farawa',
      role_investor:   'Mai zuba jari',
      role_mentor:     'Mai ba da shawara',
    },
    errors: {
      required_field:  'Ana buƙatar wannan filin',
      generic:         'Wani abu ya yi kuskure. Da fatan za a sake gwadawa.',
    },
  },

  /* ── ARABIC ──────────────────────────────────────────────── */
  ar: {
    common: {
      app_name:      'هوب فيوجن أفريقيا',
      tagline:       'تمكين. ابتكار. ازدهار.',
      loading:       'جارٍ التحميل…',
      save:          'حفظ',
      cancel:        'إلغاء',
      submit:        'إرسال',
      continue:      'متابعة',
      back:          'رجوع',
      view_all:      'عرض الكل',
      search:        'بحث',
      apply:         'تقدم',
      close:         'إغلاق',
      done:          'تم',
      required:      'مطلوب',
      days_left:     '{{count}} أيام متبقية',
      just_now:      'الآن',
    },
    nav: {
      dashboard:     'لوحة التحكم',
      ai_matching:   'المطابقة بالذكاء الاصطناعي',
      grants:        'المنح',
      elearning:     'التعلم الإلكتروني',
      mentorship:    'الإرشاد',
      government:    'الدعم الحكومي',
      marketplace:   'السوق',
      settings:      'الإعدادات',
      sign_out:      'تسجيل الخروج',
      sign_in:       'تسجيل الدخول',
      get_started:   'ابدأ الآن',
      how_it_works:  'كيف يعمل',
      platform:      'المنصة',
      impact:        'الأثر',
      sdgs:          'أهداف التنمية المستدامة',
      about:         'حول',
    },
    home: {
      hero_headline:   'حيث يلتقي <span class="line-green">الابتكار</span> الأفريقي<br/>بـ <span class="line-gold">الفرص</span>',
      hero_sub:        'منصة موحدة تربط الشركات الناشئة والمستثمرين والموجهين والموارد عبر القارة. تمكين. ابتكار. ازدهار.',
      hero_badge:      'إطلاق تجريبي — 5,000 شركة ناشئة. 50 مليون دولار تمويل.',
      eyebrow:         "نظام الشركات الناشئة رقم #1 في أفريقيا",
      watch_story:     'شاهد القصة',
      launch_startup:  'أطلق شركتك الناشئة',
      stat_startups:   'شركات ناشئة في المرحلة التجريبية',
      stat_funding:    'هدف تمويل الأثر الاجتماعي',
      stat_unemployment: 'خفض البطالة بحلول عام 2030',
      stat_market:     'فرص السوق الأفريقية',
      how_badge:       'كيف يعمل',
      how_title:       'من الفكرة إلى الأثر في أربع خطوات',
      how_sub:         'رحلة سلسة مصممة لرواد الأعمال الأفارقة الذين يواجهون تحديات حقيقية على أرض الواقع.',
      step1_title:     'سجل شركتك الناشئة',
      step1_desc:      'أنشئ ملفك الشخصي، وصف رؤيتك واحصل على التحقق في أقل من 10 دقائق.',
      step1_body:      'قم ببناء ملف تعريف شركتك الناشئة مع تفاصيل العرض والفريق والقطاع والاحتياجات التمويلية. يبدأ ذكاؤنا الاصطناعي بالعمل فوراً.',
      step2_title:     'المطابقة بالذكاء الاصطناعي',
      step2_desc:      'توصلك منصتنا بالمستثمرين والموجهين والموارد المناسبة فوراً.',
      step2_body:      'يقوم محرك الذكاء الاصطناعي بمسح آلاف المستثمرين والموجهين للعثور على التطابق المثالي بناءً على القطاع والمرحلة والأهداف.',
      step3_title:     'الوصول إلى التمويل',
      step3_desc:      'تقدم بطلب للحصول على المنح ورأس المال الاستثماري والتمويل الجماعي من لوحة تحكم واحدة موحدة.',
      step3_body:      'تقدم بطلب للحصول على المنح ورأس المال الاستثماري وشبكات التمويل الجماعي من لوحة تحكم واحدة موحدة.',
      step4_title:     'التوسع والازدهار',
      step4_desc:      'استخدم سوقنا والتعلم الإلكتروني والشراكات العالمية للنمو خارج الحدود.',
      step4_body:      'ادخل إلى السوق المتكاملة لبيع المنتجات، والتسجيل في دورات المؤسسين، وأتمتة مكتبك الخلفي.',
      cta_headline:    'مستقبل أفريقيا يبنيه أشخاص مثلك.',
      cta_sub:         'انضم إلى آلاف رواد الأعمال والمستثمرين والموجهين الذين يشكلون بالفعل الفصل القادم للقارة.',
      cta_startup:     'أطلق شركتي الناشئة',
      cta_investor:    'أنا مستثمر',
      ready_join:      'هل أنت مستعد للانضمام إلى الحراك؟',
    },
    auth: {
      login_title:     'مرحباً بعودتك',
      register_title:  'إنشاء حساب',
      email:           'البريد الإلكتروني',
      password:        'كلمة المرور',
      first_name:      'الاسم الأول',
      last_name:       'اسم العائلة',
      country:         'الدولة',
      role_startup:    'مؤسس شركة ناشئة',
      role_investor:   'مستثمر',
      role_mentor:     'موجّه',
    },
    errors: {
      required_field:  'هذا الحقل مطلوب',
      invalid_email:   'يرجى إدخال عنوان بريد إلكتروني صحيح',
      generic:         'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    },
  },
};

/* ============================================================
   RTL LANGUAGES
   ============================================================ */
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/* ============================================================
   i18n MANAGER CLASS
   Browser + Node.js compatible
   ============================================================ */
export class HFAi18n {
  constructor() {
    this.locale     = 'en';
    this.fallback   = 'en';
    this.dict       = translations;
    this.listeners  = [];
  }

  /* Detect browser language */
  detectLanguage() {
    const stored = localStorage.getItem('hfa_locale');
    if (stored && this.dict[stored]) return stored;
    const browser = (navigator.language || navigator.userLanguage || 'en').split('-')[0].toLowerCase();
    return this.dict[browser] ? browser : 'en';
  }

  /* Set active language */
  async setLanguage(locale) {
    if (!this.dict[locale]) {
      console.warn(`[i18n] Language "${locale}" not found, falling back to English`);
      locale = 'en';
    }
    this.locale = locale;
    localStorage.setItem('hfa_locale', locale);

    // Apply RTL
    const isRTL = RTL_LANGUAGES.includes(locale);
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.body.classList.toggle('rtl', isRTL);

    // Update all elements with data-i18n
    this._translateDOM();

    // Notify listeners
    this.listeners.forEach(fn => fn(locale, isRTL));
  }

  /* Translate a key with optional interpolation */
  t(key, vars = {}) {
    const parts   = key.split('.');
    const section = parts[0];
    const field   = parts[1];

    let value = this.dict[this.locale]?.[section]?.[field]
             ?? this.dict[this.fallback]?.[section]?.[field]
             ?? key;

    // Interpolate {{variable}} placeholders
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });
    return value;
  }

  /* Translate all elements with data-i18n attribute */
  _translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key   = el.dataset.i18n;
      const vars  = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : {};
      const trans = this.t(key, vars);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = trans;
      } else if (el.dataset.i18nHtml === 'true' || trans.includes('<') || trans.includes('&')) {
        el.innerHTML = trans;
      } else {
        el.textContent = trans;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', this.t(el.dataset.i18nAria));
    });
  }

  /* Language switcher UI */
  createSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const languages = [
      { code: 'en', name: 'English',  flag: '🇬🇧' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
      { code: 'ha', name: 'Hausa',    flag: '🇳🇬' },
      { code: 'ar', name: 'العربية',  flag: '🇪🇬' },
    ];
    const activeLang = languages.find(l => l.code === this.locale) || languages[0];
    container.innerHTML = `
      <div style="position:relative;display:inline-block">
        <button id="lang-toggle" style="display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:13px;color:#fff;transition:all .2s" onclick="document.getElementById('lang-dropdown').classList.toggle('show')">
          <i class="ti ti-language" style="font-size:16px;color:#2DB562"></i>
          <span id="current-lang-name">${activeLang.name}</span>
          <i class="ti ti-chevron-down" style="font-size:14px;color:rgba(255,255,255,0.4)"></i>
        </button>
        <div id="lang-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:rgba(30,30,30,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:1000;min-width:160px">
          ${languages.map(l => `
            <div onclick="window.hfai18n.setLanguage('${l.code}');document.getElementById('lang-dropdown').classList.remove('show');document.getElementById('current-lang-name').textContent='${l.name}'"
                 style="display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.85);transition:all .15s"
                 onmouseover="this.style.background='rgba(45,181,98,0.15)';this.style.color='#fff'" onmouseout="this.style.background='';this.style.color='rgba(255,255,255,0.85)'">
              <span style="font-size:18px">${l.flag}</span> ${l.name}
              ${l.code === this.locale ? '<i class="ti ti-check" style="margin-left:auto;color:#2DB562;font-size:14px"></i>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        document.getElementById('lang-dropdown')?.classList.remove('show');
      }
    });
  }

  onChange(fn) { this.listeners.push(fn); return this; }
  init() { this.setLanguage(this.detectLanguage()); return this; }
}

/* ============================================================
   RTL CSS OVERRIDES — inject into <head>
   ============================================================ */
export const RTL_CSS = `
body.rtl { direction: rtl; text-align: right; }
body.rtl .sidebar { left: auto; right: 0; border-right: none; border-left: 1px solid rgba(255,255,255,0.07); }
body.rtl .main { margin-left: 0; margin-right: var(--sidebar, 240px); }
body.rtl .nav-item { flex-direction: row-reverse; }
body.rtl .nav-item.active::before { left: auto; right: 0; border-radius: 3px 0 0 3px; }
body.rtl .nav-badge { margin-left: 0; margin-right: auto; }
body.rtl table { direction: rtl; }
body.rtl th, body.rtl td { text-align: right; }
body.rtl .stat-card::after { right: auto; left: 0; border-radius: 14px 0 14px 0; }
body.rtl .topbar-right { flex-direction: row-reverse; }
body.rtl .match-ai-pill { margin-left: 0; margin-right: auto; }
body.rtl input, body.rtl textarea, body.rtl select { text-align: right; }
`;

/* ============================================================
   BROWSER BOOTSTRAP
   ============================================================ */
if (typeof window !== 'undefined') {
  // Inject RTL CSS
  const style = document.createElement('style');
  style.textContent = RTL_CSS;
  document.head.appendChild(style);

  window.hfai18n = new HFAi18n();

  const initI18n = () => {
    window.hfai18n.init();
    window.t = (key, vars) => window.hfai18n.t(key, vars);

    // Auto-create switcher if container exists on the current page
    window.hfai18n.createSwitcher('lang-switcher');
    console.log('[HFA i18n] Initialized — language:', window.hfai18n.locale);

    // Dispatch ready event so pages using event listeners (not window.load) catch it
    // This fixes the ES Module race condition where modules execute AFTER window.load
    window.dispatchEvent(new CustomEvent('hfai18n:ready', { detail: window.hfai18n }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
}

/* ============================================================
   HOW TO USE IN HTML PAGES:

   1. Add script tag:
   <script type="module" src="/hopefusion-i18n.js"></script>

   2. Add language switcher:
   <div id="lang-switcher"></div>
   <script>window.hfai18n.createSwitcher('lang-switcher')</script>

   3. Mark translatable elements:
   <span data-i18n="nav.dashboard">Dashboard</span>
   <input data-i18n="auth.email" placeholder="Email address"/>
   <h1 data-i18n="home.hero_headline">Where African Innovation meets Opportunity</h1>

   4. Translate in JS:
   const label = t('common.save');   // → "Save" / "Enregistrer" / "Hifadhi"
   const msg = t('common.days_left', { count: 5 }); // → "5 days left"

   5. Listen for language changes:
   window.hfai18n.onChange((locale, isRTL) => {
     console.log('Language changed to:', locale, 'RTL:', isRTL);
   });
   ============================================================ */
