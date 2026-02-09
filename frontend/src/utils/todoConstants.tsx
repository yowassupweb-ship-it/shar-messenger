import React from 'react';
import {
  Inbox, Calendar, Briefcase, FolderOpen, Star, Heart,
  Target, Bookmark, Flag, Zap, Trophy, Rocket,
  Search, FileText, Megaphone, BarChart3, Share2,
  Mail, Palette, Code, Tag
} from 'lucide-react';

export const STATUS_LABELS: Record<string, string> = {
  'todo': 'К выполнению',
  'pending': 'В ожидании',
  'in-progress': 'В работе',
  'review': 'Готово к проверке',
  'cancelled': 'Отменена',
  'stuck': 'Застряла'
};

export const STATUS_COLORS: Record<string, string> = {
  'todo': 'bg-gray-500',
  'pending': 'bg-orange-500',
  'in-progress': 'bg-blue-500',
  'review': 'bg-green-500',
  'cancelled': 'bg-red-500',
  'stuck': 'bg-yellow-600'
};

export const LIST_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  folder: <FolderOpen className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  bookmark: <Bookmark className="w-4 h-4" />,
  flag: <Flag className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  rocket: <Rocket className="w-4 h-4" />
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  megaphone: <Megaphone className="w-4 h-4" />,
  'bar-chart': <BarChart3 className="w-4 h-4" />,
  'share-2': <Share2 className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  tag: <Tag className="w-4 h-4" />
};

export const LIST_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6'
];

// ID списка "Техническое задание"
export const TZ_LIST_ID = 'tz-list';
