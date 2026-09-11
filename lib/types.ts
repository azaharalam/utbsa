export type MemberStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'alumni';
export type Role = 'member' | 'admin';

export type Member = {
  id: string;
  full_name: string;
  email: string;                       // the address we send to
  university_email: string | null;     // proof of UToledo, may be dead
  personal_email: string | null;       // survives graduation
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
  household_id: string | null;   // attendance only — never dues
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
  // Selected by directory() — declared here so pages can show "Since fall 2024".
  arrival_semester: string | null;
  arrival_year: number | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  hometown_bd: string | null;
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
  is_potluck: boolean;
  cancelled_at: string | null;

  // Sporting events. Players register individually (event_players); spectators
  // RSVP per household as usual. Only the champion and runner-up are recorded.
  is_tournament: boolean;
  player_reg_closes_at: string | null;
  teams_published_at: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  // Asked of playing students only, and shown to players and organisers —
  // never on the public event page.
  player_contribution_cents: number;
  cost_breakdown: string | null;
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
  id: string; title: string; sort_order: number; session?: string;
  member_id: string; full_name: string; photo_url: string | null;
  department: string | null; email: string;
};
