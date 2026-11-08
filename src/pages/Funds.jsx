import React from 'react';
import { TargetIcon } from '../components/ui/Icons';
import { money } from '../utils/format';
import { totalFundBalance, totalAssets, availableBalance, fundBalance } from '../utils/storage';

export function Funds({ db, openFund, transferFund, deleteFund, adjustBalance }) {
  const allocated = totalFundBalance(db);
  const assets = totalAssets(db);
  const available = availableBalance(db);

  return (
    <div className="page">
      <div className="row between">
        <h2>Quỹ</h2>
        <button className="btn sm" onClick={() => openFund({})}>+ Tạo quỹ</button>
      </div>
      <div className="card sum">
        <small>Tổng tài sản</small>
        <h1>{money(assets)}</h1>
        <div className="three">
          <div>
            <small>Số dư hiện có</small>
            <b>{money(available)}</b>
            <button className="btn sm out" style={{ marginTop: 8 }} onClick={adjustBalance}>
              Điều chỉnh
            </button>
          </div>
          <div>
            <small>Đã phân bổ vào quỹ</small>
            <b>{money(allocated)}</b>
          </div>
          <div>
            <small>Số quỹ</small>
            <b>{db.goals.length}</b>
          </div>
        </div>
      </div>
      <p className="mut s">Nạp và rút tiền chỉ chuyển tiền giữa số dư hiện có và các quỹ, nên tổng tài sản không đổi.</p>
      <div className="cols3">
        {db.goals.map(fund => (
          <div key={fund.id} className="card goal">
            <div className="goal-top">
              <div className="goal-title-wrap">
                <TargetIcon s={22} color="var(--acc)" />
                <b className="goal-title-text">{fund.title}</b>
              </div>
              <div className="goal-actions">
                <button className="ib" onClick={() => openFund(fund)} title="Đổi tên">✎</button>
                <button className="ib" onClick={() => deleteFund(fund)} title="Xóa quỹ">🗑</button>
              </div>
            </div>
            <div className="goal-num-row">
              <h2>{money(fundBalance(fund))}</h2>
            </div>
            <small className="goal-meta-row">Số tiền đang dành riêng</small>
            <div className="row gap goal-foot">
              <button className="btn sm grow" onClick={() => transferFund(fund, 'deposit')}>
                Nạp
              </button>
              <button className="btn sm out grow" onClick={() => transferFund(fund, 'withdraw')}>
                Rút
              </button>
            </div>
          </div>
        ))}
      </div>
      {!db.goals.length && (
        <div className="card empty">
          <TargetIcon s={48} color="var(--mut)" />
          <p>Chưa có quỹ nào.</p>
          <button className="btn sm" onClick={() => openFund({})}>+ Tạo quỹ đầu tiên</button>
        </div>
      )}
    </div>
  );
}
