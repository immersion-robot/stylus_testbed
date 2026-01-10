#![cfg_attr(not(any(feature = "export-abi", test)), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolError},
    prelude::*,
    storage::{StorageMap, StorageU256},
    stylus_core::log,
};

sol! {
    error InsufficientBalance();
    error InsufficientAllowance();
    error Unauthorized();

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

#[storage]
#[entrypoint]
pub struct MockERC20 {
    decimals: StorageU256,
    total_supply: StorageU256,
    balances: StorageMap<Address, StorageU256>,
    allowances: StorageMap<Address, StorageMap<Address, StorageU256>>,
}

#[public]
impl MockERC20 {
    pub fn init(&mut self, initial_supply: U256) -> Result<(), Vec<u8>> {
        if self.total_supply.get() > U256::ZERO {
            return Ok(()); // 이미 초기화됨
        }

        let deployer = self.vm().msg_sender();
        self.total_supply.set(initial_supply);
        self.balances.setter(deployer).set(initial_supply);
        self.decimals.set(U256::from(18));

        log(self.vm(), Transfer {
            from: Address::ZERO,
            to: deployer,
            value: initial_supply,
        });

        Ok(())
    }

    pub fn name(&self) -> Vec<u8> {
        // "Tether USD"를 bytes로 반환
        b"Tether USD".to_vec()
    }

    pub fn symbol(&self) -> Vec<u8> {
        // "USDT"를 bytes로 반환
        b"USDT".to_vec()
    }

    pub fn decimals(&self) -> U256 {
        self.decimals.get()
    }

    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.getter(owner).get()
    }

    pub fn transfer(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        self.transfer_internal(sender, to, amount)
    }

    pub fn approve(&mut self, spender: Address, amount: U256) -> Result<(), Vec<u8>> {
        let owner = self.vm().msg_sender();
        self.allowances.setter(owner).setter(spender).set(amount);

        log(self.vm(), Approval {
            owner,
            spender,
            value: amount,
        });

        Ok(())
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.getter(owner).get(spender)
    }

    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        let spender = self.vm().msg_sender();
        let current_allowance = self.allowances.getter(from).get(spender);

        if current_allowance < amount {
            return Err(InsufficientAllowance {}.abi_encode());
        }

        self.allowances.setter(from).setter(spender).set(current_allowance - amount);
        self.transfer_internal(from, to, amount)
    }

    pub fn mint(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        // 간단한 mock이므로 누구나 mint 가능 (실제로는 권한 체크 필요)
        let current_supply = self.total_supply.get();
        let new_supply = current_supply + amount;
        self.total_supply.set(new_supply);

        let current_balance = self.balances.getter(to).get();
        self.balances.setter(to).set(current_balance + amount);

        log(self.vm(), Transfer {
            from: Address::ZERO,
            to,
            value: amount,
        });

        Ok(())
    }
}

impl MockERC20 {
    fn transfer_internal(
        &mut self,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        let from_balance = self.balances.getter(from).get();
        if from_balance < amount {
            return Err(InsufficientBalance {}.abi_encode());
        }

        self.balances.setter(from).set(from_balance - amount);
        let to_balance = self.balances.getter(to).get();
        self.balances.setter(to).set(to_balance + amount);

        log(self.vm(), Transfer {
            from,
            to,
            value: amount,
        });

        Ok(())
    }
}


