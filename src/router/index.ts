import {createRouter,createWebHashHistory} from 'vue-router'
const view=(name:string)=>()=>import(`../views/${name}.vue`)
export default createRouter({history:createWebHashHistory(),routes:[
 {path:'/',component:view('SplashView')},{path:'/onboarding',component:view('OnboardingView')},{path:'/name',component:view('NameView')},{path:'/home',component:view('HomeView'),meta:{nav:true}},{path:'/story',component:view('StoryView'),meta:{nav:true}},{path:'/conversation/:id',component:view('ConversationView')},{path:'/choice/:id',component:view('ChoiceView')},{path:'/result/:id',component:view('ResultView')},{path:'/review',component:view('ReviewView'),meta:{nav:true}},{path:'/memories',component:view('MemoriesView'),meta:{nav:true}},{path:'/profile',component:view('ProfileView'),meta:{nav:true}}
]})
