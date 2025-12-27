#![cfg_attr(not(any(feature = "export-abi", test)), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolCall, SolError},
    call::RawCall,
    prelude::*,
    storage::{StorageAddress, StorageBool, StorageMap, StorageU256},
    stylus_core::log,
};

sol! {
    error InsufficientBalance();
    error InvalidContentType();
    error Unauthorized();
    error TransferFailed();

    event PurchaseEvent(
        address indexed buyer,
        uint256 indexed contentType,
        uint256 purchaseTime,
        uint256 amount,
        uint256 tokenId
    );

    // ERC20 함수 인터페이스
    interface IERC20 {
        function transferFrom(address from, address to, uint256 amount) external;
        function transfer(address to, uint256 amount) external;
        function balanceOf(address account) external view returns (uint256);
        function allowance(address owner, address spender) external view returns (uint256);
    }
}

#[storage]
#[entrypoint]
pub struct ContentPurchaseContract {
    owner: StorageAddress,
    usdt_address: StorageAddress,
    content_prices: StorageMap<u64, StorageU256>,
    next_token_id: StorageU256,
    permissions: StorageMap<Address, StorageMap<u64, StorageBool>>,
    locked: StorageBool,
}

#[public]
impl ContentPurchaseContract {
    pub fn init(&mut self, token_address: Address) -> Result<(), Vec<u8>> {
        if !self.owner.get().is_zero() {
            return Err(Unauthorized {}.abi_encode()); 
        }
        self.owner.set(self.vm().msg_sender());
        self.usdt_address.set(token_address);
        self.next_token_id.set(U256::from(1));
        self.locked.set(false);

        // 기본 가격 설정 (USDT 6자리 소수점 반영)
        self.content_prices.setter(1).set(U256::from(45_000_000u64)); // 45 USDT
        self.content_prices.setter(2).set(U256::from(50_000_000u64)); // 50 USDT
        self.content_prices.setter(3).set(U256::from(55_000_000u64)); // 55 USDT
        Ok(())
    }

    pub fn purchase_content(&mut self, content_type: u64) -> Result<(), Vec<u8>> {
        self.non_reentrant()?;

        if content_type < 1 || content_type > 3 {
            self.locked.set(false);
            return Err(InvalidContentType {}.abi_encode());
        }

        let price = self.content_prices.get(content_type);
        if price.is_zero() {
            self.locked.set(false);
            return Err(InvalidContentType {}.abi_encode());
        }

        // 1. 잔액 확인
        let buyer = self.vm().msg_sender();
        let user_balance = self.get_usdt_balance(buyer);
        if user_balance < price {
            self.locked.set(false);
            return Err(InsufficientBalance {}.abi_encode());
        }

        // 2. USDT transferFrom 실행 (Low-level call)
        let usdt_addr = self.usdt_address.get();
        let contract_addr = self.vm().contract_address();
        
        let transfer_from_call = IERC20::transferFromCall {
            from: buyer,
            to: contract_addr,
            amount: price,
        };
        
        let call_data = transfer_from_call.abi_encode();
        let result = unsafe {
            RawCall::new()
                .call(usdt_addr, &call_data)?
        };
        
        // USDT transferFrom은 성공 시 리턴값이 없거나 true를 반환
        // 리턴 데이터가 있고 false인 경우에만 실패로 처리
        if result.len() >= 32 {
            let success = U256::from_be_slice(&result[..32]);
            if success == U256::ZERO {
                self.locked.set(false);
                return Err(TransferFailed {}.abi_encode());
            }
        }

        // 3. 상태 업데이트 및 권한 부여
        let token_id = self.next_token_id.get();
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
        let amount = self.get_usdt_balance(self.vm().contract_address());
        if amount > U256::ZERO {
            let usdt_addr = self.usdt_address.get();
            
            let transfer_call = IERC20::transferCall {
                to: self.owner.get(),
                amount,
            };
            
            let call_data = transfer_call.abi_encode();
            let result = unsafe {
                RawCall::new()
                    .call(usdt_addr, &call_data)?
            };
            
            // USDT transfer는 성공 시 리턴값이 없거나 true를 반환
            // 리턴 데이터가 있고 false인 경우에만 실패로 처리
            if result.len() >= 32 {
                let success = U256::from_be_slice(&result[..32]);
                if success == U256::ZERO {
                    return Err(TransferFailed {}.abi_encode());
                }
            }
        }
        Ok(())
    }

    pub fn withdraw_native(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        let amount = self.vm().balance(self.vm().contract_address());
        if amount > U256::ZERO {
            self.vm().transfer_eth(self.owner.get(), amount)?;
        }
        Ok(())
    }

    pub fn get_usdt_balance(&mut self, account: Address) -> U256 {
        let usdt_addr = self.usdt_address.get();
        
        let balance_of_call = IERC20::balanceOfCall { account };
        let call_data = balance_of_call.abi_encode();
        
        let result = unsafe {
            RawCall::new()
                .call(usdt_addr, &call_data)
        };
        if let Ok(result) = result {
            if result.len() >= 32 {
                return U256::from_be_slice(&result[..32]);
            }
        }
        U256::ZERO
    }

    pub fn get_allowance(&mut self, user: Address) -> U256 {
        let usdt_addr = self.usdt_address.get();
        let contract_addr = self.vm().contract_address();
        
        let allowance_call = IERC20::allowanceCall {
            owner: user,
            spender: contract_addr,
        };
        let call_data = allowance_call.abi_encode();
        
        let result = unsafe {
            RawCall::new()
                .call(usdt_addr, &call_data)
        };
        if let Ok(result) = result {
            if result.len() >= 32 {
                return U256::from_be_slice(&result[..32]);
            }
        }
        U256::ZERO
    }

    pub fn balance(&self) -> U256 {
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

    fn non_reentrant(&mut self) -> Result<(), Vec<u8>> {
        if self.locked.get() {
            return Err(Unauthorized {}.abi_encode());
        }
        self.locked.set(true);
        Ok(())
    }
}
