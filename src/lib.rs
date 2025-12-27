#![cfg_attr(not(any(feature = "export-abi", test)), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolError},
    prelude::*,
    storage::{StorageAddress, StorageBool, StorageMap, StorageU256},
    stylus_core::log,
};

sol! {
    error InsufficientBalance();
    error InvalidContentType();
    error Unauthorized();

    event PurchaseEvent(
        address indexed buyer,
        uint256 indexed contentType,
        uint256 purchaseTime,
        uint256 amount,
        uint256 tokenId
    );
}

#[storage]
#[entrypoint]
pub struct ContentPurchaseContract {
    owner: StorageAddress,
    content_prices: StorageMap<u64, StorageU256>,
    next_token_id: StorageU256,
    permissions: StorageMap<Address, StorageMap<u64, StorageBool>>,
    locked: StorageBool,
}

#[public]
impl ContentPurchaseContract {
    pub fn init(&mut self) -> Result<(), Vec<u8>> {
        if !self.owner.get().is_zero() {
            return Ok(()); 
        }
        self.owner.set(self.vm().msg_sender());
        self.next_token_id.set(U256::from(1));
        self.locked.set(false);

        self.content_prices.setter(1).set(U256::from(1));
        self.content_prices.setter(2).set(U256::from(2));
        self.content_prices.setter(3).set(U256::from(3));
        Ok(())
    }

    #[payable]
    pub fn purchase_content(&mut self, content_type: u64) -> Result<(), Vec<u8>> {
        if self.locked.get() {
            return Err(Unauthorized {}.abi_encode());
        }
        self.locked.set(true);

        if content_type < 1 || content_type > 3 {
            self.locked.set(false);
            return Err(InvalidContentType {}.abi_encode());
        }

        let price = self.content_prices.get(content_type);
        if price.is_zero() {
            self.locked.set(false);
            return Err(InvalidContentType {}.abi_encode());
        }

        if self.vm().msg_value() < price {
            self.locked.set(false);
            return Err(InsufficientBalance {}.abi_encode());
        }

        let token_id = self.next_token_id.get();
        let buyer = self.vm().msg_sender();

        self.next_token_id.set(token_id + U256::from(1));
        self.permissions.setter(buyer).setter(content_type).set(true);

        // 이벤트 로그
        log(self.vm(), PurchaseEvent {
            buyer,
            contentType: U256::from(content_type),
            purchaseTime: U256::from(self.vm().block_timestamp()),
            amount: price,
            tokenId: token_id,
        });

        self.locked.set(false);
        Ok(())
    }

    pub fn has_permission(&self, user: Address, content_type: u64) -> bool {
        if content_type < 1 || content_type > 3 {
            return false;
        }
        self.permissions.getter(user).get(content_type)
    }

    pub fn get_content_price(&self, content_type: u64) -> U256 {
        self.content_prices.get(content_type)
    }

    pub fn set_content_price(&mut self, content_type: u64, price: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        if content_type < 1 || content_type > 3 {
            return Err(InvalidContentType {}.abi_encode());
        }
        self.content_prices.setter(content_type).set(price);
        Ok(())
    }

    pub fn withdraw(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        // address() 대신 contract_address() 사용
        let amount = self.vm().balance(self.vm().contract_address());
        if amount > U256::ZERO {
            self.vm().transfer_eth(self.owner.get(), amount)?;
        }
        Ok(())
    }

    pub fn balance(&self) -> U256 {
        // address() 대신 contract_address() 사용
        self.vm().balance(self.vm().contract_address())
    }
}

impl ContentPurchaseContract {
    fn only_owner(&self) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err(Unauthorized {}.abi_encode());
        }
        Ok(())
    }
}