# used to exercise the `if command is not git command` logic below. change this to an invalid value to test printing out install message
COMMAND_PREFIX='secrets'

if ! git secrets > /dev/null 2>&1; then
  echo "Please install 'git-secrets' from https://github.com/awslabs/git-secrets and run 'git secrets --install' in the apps/ repo"
  exit 1
fi

git config --remove-section secrets

# Postgres
git secrets --add 'postgres:\/\/.*\:.*@([0-9]*\.?)*:[0-9]{4}\/.*'
git secrets --add --allowed 'postgres:postgres@1\.2\.3\.4:[0-9]{4}\/.*'

# Cloudinary
git secrets --add "cloudinary://.*"

# Firebase URL
git secrets --add ".*firebaseio\.com"

# Slack Token
git secrets --add "(xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})"

# RSA private key
git secrets --add "\-\-\-\-\-BEGIN RSA PRIVATE KEY\-\-\-\-\-"

# SSH (DSA) private key
git secrets --add "\-\-\-\-\-BEGIN DSA PRIVATE KEY\-\-\-\-\-"

# SSH (EC) private key
git secrets --add "\-\-\-\-\-BEGIN EC PRIVATE KEY\-\-\-\-\-"

# PGP private key block
git secrets --add "\-\-\-\-\-BEGIN PGP PRIVATE KEY BLOCK\-\-\-\-\-"

# Amazon AWS
git secrets --add '.*[a-z0-9]*.rds.amazonaws.com:[0-9]*\/.*'
git secrets --add '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}'

# Amazon MWS Auth Token
git secrets --add "amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

# AWS API Key
git secrets --add "AKIA[0-9A-Z]{16}"

# Facebook Access Token
git secrets --add "EAACEdEose0cBA[0-9A-Za-z]+"

# Facebook OAuth
git secrets --add "[f|F][a|A][c|C][e|E][b|B][o|O][o|O][k|K].*['|\"][0-9a-f]{32}['|\"]"

# GitHub
git secrets --add "[g|G][i|I][t|T][h|H][u|U][b|B].*['|\"][0-9a-zA-Z]{35,40}['|\"]"

# Generic API Key
git secrets --add "[a|A][p|P][i|I][_]?[k|K][e|E][y|Y].*['|\"][0-9a-zA-Z]{32,45}['|\"]"

# Generic Secret
git secrets --add "[s|S][e|E][c|C][r|R][e|E][t|T].*['|\"][0-9a-zA-Z]{32,45}['|\"]"

# Google API Key
git secrets --add "AIza[0-9A-Za-z\\-_]{35}"

# Google Cloud Platform API Key
git secrets --add "AIza[0-9A-Za-z\\-_]{35}"

# Google Cloud Platform OAuth
git secrets --add "[0-9]+-[0-9A-Za-z_]{32}\\.apps\\.googleusercontent\\.com"

# Google Drive API Key
git secrets --add "AIza[0-9A-Za-z\\-_]{35}"

# Google Drive OAuth
git secrets --add "[0-9]+-[0-9A-Za-z_]{32}\\.apps\\.googleusercontent\\.com"

# Google Gmail API Key
git secrets --add "AIza[0-9A-Za-z\\-_]{35}"

# Google Gmail OAuth
git secrets --add "[0-9]+-[0-9A-Za-z_]{32}\\.apps\\.googleusercontent\\.com"

# Google OAuth Access Token
git secrets --add "ya29\\.[0-9A-Za-z\\-_]+"

# Google YouTube API Key
git secrets --add "AIza[0-9A-Za-z\\-_]{35}"

# Google YouTube OAuth
git secrets --add "[0-9]+-[0-9A-Za-z_]{32}\\.apps\\.googleusercontent\\.com"

# Heroku API Key
git secrets --add "[h|H][e|E][r|R][o|O][k|K][u|U].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"

# MailChimp API Key
git secrets --add "[0-9a-f]{32}-us[0-9]{1,2}"

# Mailgun API Key
git secrets --add "key-[0-9a-zA-Z]{32}"

# Password in URL
git secrets --add "[a-zA-Z]{3,10}://[^/\\s:@]{3,20}:[^/\\s:@]{3,20}@.{1,100}[\"'\\s]"

# Picatic API Key
git secrets --add "sk_live_[0-9a-z]{32}"

# Slack Webhook
git secrets --add "https://hooks.slack.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24}"

# Stripe API Key
git secrets --add "sk_live_[0-9a-zA-Z]{24}"

# Stripe Restricted API Key
git secrets --add "rk_live_[0-9a-zA-Z]{24}"

# Square Access Token
git secrets --add "sq0atp-[0-9A-Za-z\\-_]{22}"

# Square OAuth Secret
git secrets --add "sq0csp-[0-9A-Za-z\\-_]{43}"

# Twilio API Key
git secrets --add "SK[0-9a-fA-F]{32}"

# Twitter Access Token
git secrets --add "[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[1-9][0-9]+-[0-9a-zA-Z]{40}"

# Twitter OAuth
git secrets --add "[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*['|\"][0-9a-zA-Z]{35,44}['|\"]"
