export type MemberStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'alumni';
export type Role = 'member' | 'admin';

export type Member = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  heard_from: string | null;
  photo_url: string | null;
  member_type: 'student' | 'spouse' | 'faculty' | 'alumni' | 'community';
  student_level: 'undergrad' | 'masters' | 'phd' | 'na' | null;
  department: string | null;
  expected_grad: string | null;
  hometown_bd: string | null;
  arrival_semester: 'spring' | 'summer' | 'fall' | null;
  arrival_year: number | null;
  bio: string | null;
  linkedin_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  show_email: boolean;
  show_phone: boolean;
  show_photo: boolean;
  show_department: boolean;
  show_hometown: boolean;
  in_directory: boolean;
  status: MemberStatus;
  role: Role;
  email_verified_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
};

/** What one member is allowed to see about another. Never contains phone
 *  or email unless that member switched it on. */
export type DirectoryEntry = {
  id: string;
  full_name: string;
  member_type: string;
  student_level: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  hometown_bd: string | null;
  arrival_semester: string | null;
  arrival_year: number | null;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  bengali_title: string | null;
  description: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  location_addr: string | null;
  is_public: boolean;
  is_published: boolean;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  category: string | null;
  author_id: string | null;
  author_name?: string | null;
  author_photo?: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
};

export type Term = {
  id: string; name: string; season: string; year: number;
  starts_on: string; ends_on: string; is_current: boolean;
};

export type Officer = {
  id: string; title: string; sort_order: number;
  member_id: string; full_name: string; photo_url: string | null;
  department: string | null; email: string;
};
