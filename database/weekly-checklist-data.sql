-- Insert default weekly checklist items for Levi
INSERT INTO weekly_checklist_items (id, user_id, category, subcategory, name, requires_daily, order_index) VALUES
-- Personal - Health & Supplements
('levi-personal-health-nad', 'levi', 'personal', 'Health', 'NAD', true, 1),
('levi-personal-health-sleep', 'levi', 'personal', 'Health', 'SLEEP', true, 2),
('levi-personal-health-focus', 'levi', 'personal', 'Health', 'FOCUS', true, 3),
('levi-personal-health-magna-calm', 'levi', 'personal', 'Health', 'MAGNA CALM', true, 4),
('levi-personal-health-b-vitamin', 'levi', 'personal', 'Health', 'B+ VITAMIN', true, 5),
('levi-personal-health-tri-mag', 'levi', 'personal', 'Health', 'TRI-MAG', true, 6),
('levi-personal-health-modern-man', 'levi', 'personal', 'Health', 'Modern Man', true, 7),

-- Personal - Supplements  
('levi-personal-supplements-oregano', 'levi', 'personal', 'Supplements', 'OREGANO', true, 1),
('levi-personal-supplements-vitamin-d3', 'levi', 'personal', 'Supplements', 'VITAMIN D3', true, 2),
('levi-personal-supplements-ashwagandha', 'levi', 'personal', 'Supplements', 'ASHWAGANDHA', true, 3),
('levi-personal-supplements-adhd-meds', 'levi', 'personal', 'Supplements', 'ADHD MEDS', true, 4),

-- Personal - Personal Care
('levi-personal-personal-care-brush-teeth', 'levi', 'personal', 'Personal Care', 'BRUSH TEETH', true, 1),
('levi-personal-personal-care-floss', 'levi', 'personal', 'Personal Care', 'FLOSS', true, 2),
('levi-personal-personal-care-shower', 'levi', 'personal', 'Personal Care', 'SHOWER', true, 3),
('levi-personal-personal-care-shave', 'levi', 'personal', 'Personal Care', 'SHAVE', false, 4),

-- Personal - Activities
('levi-personal-activities-family-time', 'levi', 'personal', 'Activities', 'FAMILY TIME', true, 1),
('levi-personal-activities-house-chores', 'levi', 'personal', 'Activities', 'HOUSE CHORES', true, 2),
('levi-personal-activities-workout-board', 'levi', 'personal', 'Activities', 'WORKOUT-BOARD', false, 3),
('levi-personal-activities-walk', 'levi', 'personal', 'Activities', 'WALK', true, 4),

-- Personal - Schedule
('levi-personal-schedule-wake-time', 'levi', 'personal', 'Schedule', 'WAKE TIME', true, 1),
('levi-personal-schedule-leave-house', 'levi', 'personal', 'Schedule', 'LEAVE HOUSE', true, 2),
('levi-personal-schedule-to-sleep-time', 'levi', 'personal', 'Schedule', 'TO SLEEP TIME', true, 3),
('levi-personal-schedule-weigh-in', 'levi', 'personal', 'Schedule', 'WEIGH IN', false, 4),

-- Business - Morning Customer Contact
('levi-business-morning-customer-contact-emails-save-delete', 'levi', 'business', 'Morning Customer Contact', 'EMAILS - Save/Delete', true, 1),
('levi-business-morning-customer-contact-triton-phone-call-back', 'levi', 'business', 'Morning Customer Contact', 'TRITON PHONE - Call back', true, 2),
('levi-business-morning-customer-contact-triton-phone-text-back', 'levi', 'business', 'Morning Customer Contact', 'TRITON PHONE - Text back', true, 3),
('levi-business-morning-customer-contact-new-leads-folder', 'levi', 'business', 'Morning Customer Contact', 'New Leads Folder', true, 4),
('levi-business-morning-customer-contact-personal-phone-calls-text', 'levi', 'business', 'Morning Customer Contact', 'Personal phone - Calls/text', true, 5),

-- Business - Afternoon Customer Contact
('levi-business-afternoon-customer-contact-emails-save-delete', 'levi', 'business', 'Afternoon Customer Contact', 'EMAILS - Save/Delete', true, 1),
('levi-business-afternoon-customer-contact-triton-phone-call-back', 'levi', 'business', 'Afternoon Customer Contact', 'TRITON PHONE - Call back', true, 2),
('levi-business-afternoon-customer-contact-triton-phone-text-back', 'levi', 'business', 'Afternoon Customer Contact', 'TRITON PHONE - Text back', true, 3),
('levi-business-afternoon-customer-contact-personal-phone-calls-text', 'levi', 'business', 'Afternoon Customer Contact', 'Personal phone - Calls/text', true, 4),
('levi-business-afternoon-customer-contact-asana-triton-sales-check-in', 'levi', 'business', 'Afternoon Customer Contact', 'Asana - Triton sales check in', true, 5),

-- Business - File Organization
('levi-business-file-organization-10-min-cloud-file-organize', 'levi', 'business', 'File Organization', '10 Min. Cloud File Organize', true, 1),
('levi-business-file-organization-scan-docs-and-file', 'levi', 'business', 'File Organization', 'Scan Docs and file', true, 2),

-- Business - Bookkeeping
('levi-business-bookkeeping-business', 'levi', 'business', 'Bookkeeping', 'Business', true, 1),
('levi-business-bookkeeping-personal', 'levi', 'business', 'Bookkeeping', 'Personal', true, 2),

-- Business - Code
('levi-business-code-website-work', 'levi', 'business', 'Code', 'Website work', true, 1),
('levi-business-code-planning', 'levi', 'business', 'Code', 'Planning', true, 2),
('levi-business-code-product-creative', 'levi', 'business', 'Code', 'Product creative', true, 3);