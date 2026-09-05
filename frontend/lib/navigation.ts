import {
  CalendarDays,
  ClipboardList,
  Home,
  Megaphone,
  MessagesSquare,
} from 'lucide-react';

export const modules = [
  {
    id: 'home',
    href: '/',
    title: 'Home',
    icon: Home,
    description: 'Uma visão do seu dia de trabalho.',
  },
  {
    id: 'agenda',
    href: '/agenda',
    title: 'Agenda',
    icon: CalendarDays,
    description: 'Reuniões, compromissos e atividades em um só lugar.',
  },
  {
    id: 'avisos',
    href: '/avisos',
    title: 'Avisos',
    icon: Megaphone,
    description: 'Comunicados para manter a equipe informada.',
  },
  {
    id: 'demandas',
    href: '/demandas',
    title: 'Demandas',
    icon: ClipboardList,
    description: 'Acompanhe as atividades do início à conclusão.',
  },
  {
    id: 'chats',
    href: '/chats',
    title: 'Chats',
    icon: MessagesSquare,
    description: 'Um espaço para conversar com sua equipe.',
  },
];
