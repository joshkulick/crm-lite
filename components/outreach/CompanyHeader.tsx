import React from 'react';
import { UserPlus, CheckCircle } from 'lucide-react';
import { Company } from './types';

interface CompanyHeaderProps {
  company: Company;
  currentUsername: string | undefined;
  claimingCompany: number | null;
  unclaimingCompany: number | null;
  onClaimCompany: (company: Company) => void;
  onUnclaimCompany: (company: Company) => void;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  company,
  currentUsername,
  claimingCompany,
  unclaimingCompany,
  onClaimCompany,
  onUnclaimCompany
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground mb-2">
          {company.company_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Added on {new Date(company.created_at).toLocaleDateString()}
        </p>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Claim/Unclaim Button */}
        {!company.is_claimed || company.claimed_by_username === currentUsername ? (
          company.is_claimed ? (
            <button
              onClick={() => onUnclaimCompany(company)}
              disabled={unclaimingCompany === company.id}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                unclaimingCompany === company.id
                  ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-800'
              }`}
            >
              {unclaimingCompany === company.id ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3 rotate-45" />
                  <span>Remove Lead</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => onClaimCompany(company)}
              disabled={claimingCompany === company.id}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                claimingCompany === company.id
                  ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                  : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              }`}
            >
              {claimingCompany === company.id ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  <span>Claim Lead</span>
                </>
              )}
            </button>
          )
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-muted-foreground">Claimed by {company.claimed_by_username}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHeader; 