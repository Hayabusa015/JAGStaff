-- Class periods can now be combined blocks (e.g. "5/6", "8/9"), so the
-- period column needs to hold text, not just a plain integer.
alter table classroom_classes
  alter column period type text using period::text;
