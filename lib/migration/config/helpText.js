module.exports = `
Usage: 
  Create new table:
    wildayjs generate:migration CreateUsers name:string email:string:null:false:unique

  Add columns:
    wildayjs generate:migration AddPasswordToUsers password:string:null:false
    wildayjs generate:migration AddAgeAndPhoneToUsers age:integer phone:string

  Change columns:
    wildayjs generate:migration ChangeEmailInUsers email:string:null:false:unique

  Remove columns:
    wildayjs generate:migration RemovePhoneFromUsers phone

 Available column types:
  String types:
    string     : TEXT - For short strings
    text       : TEXT - For longer text
    binary     : BLOB - For binary data
  
  Numeric types:
    integer    : INTEGER - Standard integers
    bigint     : INTEGER - Large integers
    decimal    : DECIMAL - Precise decimal numbers
    float      : REAL - Floating point numbers
    number     : NUMERIC - Generic numeric type
  
  Date/Time types:
    datetime   : DATETIME - Date and time
    timestamp  : DATETIME - Alias for datetime
    date       : DATE - Just date
    time       : TIME - Just time
  
  Other types:
    boolean    : BOOLEAN - True/False values
    json       : TEXT - JSON data
    references : INTEGER - Creates a foreign key column - Creates INTEGER column with foreign key constraint (e.g., user:references → user_id INTEGER + FOREIGN KEY)
    belongs_to : INTEGER - Alias for references - Alias for references (e.g., user:belongs_to → user_id INTEGER + FOREIGN KEY)

Column modifiers:
  null:false  : NOT NULL constraint
  unique      : UNIQUE constraint
  primary     : PRIMARY KEY constraint
  default=value : Sets default value

Default value patterns:
  {id}       : Record's ID
  {timestamp}: Current timestamp (YYYYMMDDhhmmss)
  {date}     : Current date (YYYYMMDD)
  {time}     : Current time (hhmmss)
  {random}   : Random 8-character string

Examples:
  default=user_{id}              → user_1, user_2, etc
  default=member_{id}_{timestamp} → member_1_20241229235959
  default=user_{random}          → user_a1b2c3d4
  default={id}@example.com       → 1@example.com
`;
