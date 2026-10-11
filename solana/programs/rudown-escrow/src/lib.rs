use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

// Local placeholder only. `anchor keys sync` replaces this before build/deploy.
declare_id!("KEkir9aYfbwdD9URKDJyjxLUARiY2WVodfgTccddJca");
const MAX_PEOPLE: usize = 12;
const MAX_SHARE: u64 = 100_000_000; // Test-fund cap: 0.1 SOL per person.

#[program]
pub mod rudown_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, nonce: [u8; 32], plan_hash: [u8; 32], deadline: i64, participants: Vec<Pubkey>, amounts: Vec<u64>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(deadline > now && deadline <= now + 30 * 86400, EscrowError::Deadline);
        require!(!participants.is_empty() && participants.len() <= MAX_PEOPLE && participants.len() == amounts.len(), EscrowError::Terms);
        require!(plan_hash != [0; 32], EscrowError::Terms);
        for (i, wallet) in participants.iter().enumerate() {
            require!(*wallet != Pubkey::default() && !participants[..i].contains(wallet), EscrowError::Terms);
            require!(amounts[i] > 0 && amounts[i] <= MAX_SHARE, EscrowError::Terms);
        }
        require!(ctx.accounts.recipient.key() != ctx.accounts.escrow.key(), EscrowError::Terms);
        let e = &mut ctx.accounts.escrow;
        e.organizer = ctx.accounts.organizer.key();
        e.recipient = ctx.accounts.recipient.key();
        e.nonce = nonce;
        e.plan_hash = plan_hash;
        e.deadline = deadline;
        e.bump = ctx.bumps.escrow;
        e.state = 0; // 0=open, 1=cancelled, 2=released
        e.entries = participants.iter().enumerate().map(|(i, wallet)| Entry { wallet: *wallet, amount: amounts[i], deposited: 0, approved: false }).collect();
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, plan_hash: [u8; 32]) -> Result<()> {
        let e = &ctx.accounts.escrow;
        e.open(plan_hash)?;
        let index = e.member(ctx.accounts.payer.key())?;
        require!(e.entries[index].deposited == 0, EscrowError::AlreadyPaid);
        let amount = e.entries[index].amount;
        system_program::transfer(CpiContext::new(ctx.accounts.system_program.to_account_info(), Transfer {
            from: ctx.accounts.payer.to_account_info(), to: ctx.accounts.escrow.to_account_info(),
        }), amount)?;
        ctx.accounts.escrow.entries[index].deposited = amount;
        // Deposit is not permission to release; approve is a separate wallet action.
        Ok(())
    }

    pub fn approve(ctx: Context<MemberAction>, plan_hash: [u8; 32]) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        e.open(plan_hash)?;
        let index = e.member(ctx.accounts.member.key())?;
        require!(e.entries[index].deposited == e.entries[index].amount, EscrowError::Unfunded);
        e.entries[index].approved = true;
        Ok(())
    }

    // Revocation permanently cancels this immutable escrow. New terms need a new
    // nonce, new deposits and new wallet approvals; no silent cost reassignment.
    pub fn cancel(ctx: Context<MemberAction>, plan_hash: [u8; 32]) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        require!(e.plan_hash == plan_hash, EscrowError::PlanChanged);
        require!(e.state != 2, EscrowError::Released);
        require!(ctx.accounts.member.key() == e.organizer || e.entries.iter().any(|p| p.wallet == ctx.accounts.member.key()), EscrowError::Unauthorized);
        e.state = 1;
        Ok(())
    }

    // A participant can retrieve their deposit at any point before release.
    // Doing so cancels the escrow for everyone, even before the deadline.
    pub fn refund(ctx: Context<MemberAction>, plan_hash: [u8; 32]) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        require!(e.plan_hash == plan_hash, EscrowError::PlanChanged);
        require!(e.state != 2, EscrowError::Released);
        let index = e.member(ctx.accounts.member.key())?;
        let amount = e.entries[index].deposited;
        require!(amount > 0, EscrowError::Unfunded);
        e.state = 1;
        e.entries[index].deposited = 0;
        e.entries[index].approved = false;
        move_lamports(&e.to_account_info(), &ctx.accounts.member.to_account_info(), amount)
    }

    pub fn release(ctx: Context<Release>, plan_hash: [u8; 32]) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        e.open(plan_hash)?;
        require!(ctx.accounts.organizer.key() == e.organizer, EscrowError::Unauthorized);
        require!(e.entries.iter().all(|p| p.approved && p.deposited == p.amount), EscrowError::Unapproved);
        let amount = e.entries.iter().try_fold(0u64, |total, p| total.checked_add(p.deposited)).ok_or(EscrowError::Arithmetic)?;
        e.state = 2;
        for p in &mut e.entries { p.deposited = 0; }
        move_lamports(&e.to_account_info(), &ctx.accounts.recipient.to_account_info(), amount)
    }
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    let remaining = from.lamports().checked_sub(amount).ok_or(EscrowError::Arithmetic)?;
    require!(remaining >= Rent::get()?.minimum_balance(from.data_len()), EscrowError::Arithmetic);
    let received = to.lamports().checked_add(amount).ok_or(EscrowError::Arithmetic)?;
    **from.try_borrow_mut_lamports()? = remaining;
    **to.try_borrow_mut_lamports()? = received;
    Ok(())
}

#[derive(Accounts)]
#[instruction(nonce: [u8; 32])]
pub struct Initialize<'info> {
    #[account(mut)] pub organizer: Signer<'info>,
    /// CHECK: Immutable recipient address stored in escrow; never read as data.
    pub recipient: UncheckedAccount<'info>,
    #[account(init, payer=organizer, space=Escrow::SPACE, seeds=[b"escrow", organizer.key().as_ref(), nonce.as_ref()], bump)]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    #[account(mut, seeds=[b"escrow", escrow.organizer.as_ref(), escrow.nonce.as_ref()], bump=escrow.bump)]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MemberAction<'info> {
    #[account(mut)] pub member: Signer<'info>,
    #[account(mut, seeds=[b"escrow", escrow.organizer.as_ref(), escrow.nonce.as_ref()], bump=escrow.bump)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    pub organizer: Signer<'info>,
    #[account(mut, has_one=organizer, has_one=recipient, seeds=[b"escrow", escrow.organizer.as_ref(), escrow.nonce.as_ref()], bump=escrow.bump)]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: Address is constrained to the recipient committed at initialization.
    #[account(mut)] pub recipient: UncheckedAccount<'info>,
}

#[account]
pub struct Escrow {
    pub organizer: Pubkey, pub recipient: Pubkey, pub nonce: [u8; 32], pub plan_hash: [u8; 32],
    pub deadline: i64, pub bump: u8, pub state: u8, pub entries: Vec<Entry>,
}
impl Escrow {
    pub const SPACE: usize = 8 + 32 * 4 + 8 + 1 + 1 + 4 + MAX_PEOPLE * (32 + 8 + 8 + 1);
    fn open(&self, hash: [u8; 32]) -> Result<()> {
        require!(self.plan_hash == hash, EscrowError::PlanChanged);
        require!(self.state == 0, EscrowError::Closed);
        require!(Clock::get()?.unix_timestamp < self.deadline, EscrowError::Deadline);
        Ok(())
    }
    fn member(&self, wallet: Pubkey) -> Result<usize> {
        self.entries.iter().position(|p| p.wallet == wallet).ok_or_else(|| error!(EscrowError::Unauthorized))
    }
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Entry { pub wallet: Pubkey, pub amount: u64, pub deposited: u64, pub approved: bool }

#[error_code]
pub enum EscrowError {
    #[msg("Invalid immutable escrow terms")] Terms,
    #[msg("The deadline is invalid or has passed")] Deadline,
    #[msg("This wallet is not authorized")] Unauthorized,
    #[msg("The plan commitment does not match")] PlanChanged,
    #[msg("Escrow is cancelled or released")] Closed,
    #[msg("This share was already deposited")] AlreadyPaid,
    #[msg("This share is not funded")] Unfunded,
    #[msg("Every funded participant must approve release")] Unapproved,
    #[msg("Released funds cannot be refunded by this contract")] Released,
    #[msg("Invalid balance calculation")] Arithmetic,
}
